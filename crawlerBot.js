const puppeteer = require('puppeteer');
const fs = require('fs');
const TeleBot = require("telebot");
const mkdirp = require('mkdirp');

const bot = new TeleBot('541700992:AAFQHR8krVW_7Rc-Iv41G5KzYNj1xJ1bA2I');

let MAX_PAGES = 1000;
let counter = 0;

const pagesToVisit = [];
const pagesVisited = [];

let DOMAIN;
let STARTURL;

let fileToWrite = 'finishedscrapes/sender/domain.txt';

let HEADERS = {/*'Authorization': 'Basic #################'*/};

let ignorePaths = [];

let wait = false;
let waitTime = 2000;

let scroll = false;
let scrollCounter = 1;

const filterPaths = false;
const pathsToUse = [];



async function initBrowser(msg)  {
    

    const browser = await puppeteer.launch({
                        ignoreHTTPSErrors: true
                    });
    const page = await browser.newPage();
    await startSpider(STARTURL, browser, page, msg);
}


async function writeToFile(array, msg) {
    let string;
    array.sort();
    for (var key of array) {
        string += key + '\n';
    }
    string = string.split('undefined').join('');
   /* await mkdirp('finishedscrapes/'+msg.from.first_name, function(err) { 
        if (err) fs.mkdir('finishedscrapes/'+msg.from.first_name);
    });
    await fs.writeFile(fileToWrite, string, (err) => {
      if (err) throw (err);  
    });*/
    await console.log(msg.from.id);
    try{
    await bot.sendMessage(msg.from.id, string);
    } catch (err) {
        console.log(err);
    }
    await console.log('document sent');
    
    
}



async function startSpider(startUrl, browser, page, msg) {

    await page.setExtraHTTPHeaders(HEADERS);
    await console.log('Page Opened');
    await page.goto(startUrl, {waitUntil: "networkidle2"});
    await console.log('URL reached');
    if (wait) {
        await page.waitFor(waitTime);
    }
    if (scroll) {
        for (const item of Array(scrollCounter)) {
            await page.evaluate(_ => {
                window.scrollBy(0, window.innerHeight);
            });
            if (scroll && wait) {
                await page.waitFor(waitTime);
            }
        }
    }
    
    const results = await page.evaluate(() => {
        const links = [];
        const elements = document.querySelectorAll('a');
        for (const el of elements) {
            links.push(el.href);
        }
        return links;
    });
   for (const item of results) {
       if (!pagesToVisit.includes(item)) {
           pagesToVisit.push(item);
       }
   }
   await pagesVisited.push(removeFileTagAndDomain(startUrl, DOMAIN));

    await crawl(browser, page, msg);
    
}

function isPicture(string) {
    let pictureExtensions = ['jpg', 'gif', 'pdf', 'png', 'dwg', 'zip', 'xlsx'];
    for (var i = 0; i < pictureExtensions.length; i++) {
        if (string.toLowerCase().split('.').pop().includes(pictureExtensions[i]) || string.toLowerCase().includes('download')) {
            return true;
        }
    }
    return false;
}

function removeAnchorAndParameter(string) {
    string = string.split('#')[0];
    string = string.split('?')[0];
    return string;
}

function removeFileTagAndDomain(string, domain) {
    string = string.split(domain).pop();
    
    if (string.includes('.html')) {
        string = string.split('.html')[0];
    } else if (string.includes('.php')) {
        string = string.split('.php')[0];
    }
    return string;
}

function checkIgnore(string) {
    for(var i = 0; i < ignorePaths.length; i++) {
        if (string.includes('/'+ignorePaths[i]+'/')) {
            return true;
        }
    }
    return false;
}

function crawl(browser, page, msg) {
     if (typeof pagesToVisit.pop() == "undefined" || counter == MAX_PAGES) {
        printResults(browser, pagesVisited, msg);
        return;
    }
    try {
    console.log(msg.text);
    var nextPage = removeAnchorAndParameter(pagesToVisit.pop());
    
    if (!nextPage.includes(DOMAIN) || isPicture(nextPage) || nextPage.includes('mailto')
    || pagesVisited.includes(removeFileTagAndDomain(nextPage, DOMAIN)) || checkIgnore(nextPage)) {
        crawl(browser, page, msg);
    } else if (filterPaths) {
        for (const item of pathsToUse) {
            if(nextPage.includes(item)) {
                visitPage(nextPage, crawl, browser, page, msg);
            } else {
                crawl(browser, page, msg);
            }
        }
    }
    else if (typeof nextPage != "undefined") {
        visitPage(nextPage, crawl, browser, page, msg);
    }
    } catch (err) {
        crawl(browser, page, msg);
    }
}

async function visitPage(url, callback, browser, page, msg) {

   
    try{
    await page.goto(url, {waitUntil: "networkidle2"});
    }
    catch (err) {
    callback(browser, page, msg);
    return;    
    }
    await console.log('URL reached');
    if (wait) {
        await page.waitFor(waitTime);
    }
    if (scroll) {
        for (const item of Array(scrollCounter)) {
            await page.evaluate(_ => {
                window.scrollBy(0, window.innerHeight);
            });
            if (scroll && wait) {
                await page.waitFor(waitTime);
            }
        }
    }
    
    const results = await page.evaluate(() => {
        const links = [];
        const elements = document.querySelectorAll('a');
        for (const el of elements) {
            links.push(el.href);
        }
        return links;
    });
    for (const item of results) {
        if(!checkIgnore(item) && item.includes(DOMAIN) && !pagesToVisit.includes(item) && !(pagesVisited.includes(removeFileTagAndDomain(item, DOMAIN))) && !(pagesToVisit.includes(removeAnchorAndParameter((item))))) {
            pagesToVisit.push(item);
        }
    }
    
    await pagesVisited.push(removeFileTagAndDomain(url, DOMAIN));
    await console.log(pagesToVisit);
    await console.log(pagesVisited);
    if (counter%50 == 0 && counter > 10) {
        await msg.reply.text('Working...');
    }
    await counter++;
    await callback(browser, page, msg);
   
}
function printResults(browser, result, msg) {
    console.log(result);
    writeToFile(result, msg);
    browser.close();
    console.log('done');
}




bot.on('/start', (msg) => {
   msg.reply.text('Format: "password:######;domain:domain.com;start_page:www.domain.com;ignore_paths:path1,path2,path3;" \n ignore_paths not necessary.'); 
});

bot.on('text', (msg) => {
    if(msg.text !== '/start') {
        let msgArr = msg.text.split(';');
        DOMAIN = msgArr.filter(function(item){
            return item.toLowerCase().includes('domain'); 
        });
        STARTURL = msgArr.filter(function(item){
           return item.toLowerCase().includes('start_page'); 
        });
        let password = msgArr.filter(function(item){
            return item.toLowerCase().includes('password'); 
        });
        if(password.join('').split(':')[1] !== 'koira') {
            console.log(password.join('').split(':')[1]);
            return msg.reply.text('Wrong password');
        }
        if(DOMAIN.length == 1) {
            DOMAIN = DOMAIN.join('').split(':')[1].toLowerCase();
        } else {
            return msg.reply.text("Can't find domain");
        }
         if(STARTURL.length == 1) {
            STARTURL = "http://"+STARTURL.join('').split(':')[1].toLowerCase();
        } else {
            return msg.reply.text("Can't find start_page");
        }
        fileToWrite='finishedscrapes/'+msg.from.first_name+'/'+DOMAIN+'.txt';
        if (msg.text.includes('ignore_paths')){
            let ignorePathsHelper = msgArr.filter(function(item) {
               return item.toLowerCase().includes('ignore_paths');
            });
            if (ignorePathsHelper.length == 1) {
                ignorePathsHelper = ignorePathsHelper.join('').split(':')[1].toLowerCase();
                ignorePathsHelper = ignorePathsHelper.split(',');
                for (var i = 0; i < ignorePathsHelper.length; i++) {
                    ignorePaths = ignorePathsHelper;
                }
            } else {
                return msg.reply.text('Improper format');
            }
        }
        console.log(DOMAIN);
        console.log(STARTURL);
        console.log(fileToWrite);
    initBrowser(msg);    
    }
});

bot.start();