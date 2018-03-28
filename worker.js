

process.on('message', (message) => {

const puppeteer = require('puppeteer');
const fs = require('fs');
const mkdirp = require('mkdirp');
    
let MAX_PAGES = 1000;
let counter = 0;

let msg = message[0];
let DOMAIN = message[1];
let STARTURL = message[2];
let fileToWrite = message[3];
let ignorePaths = message[4];

let pagesToVisit = [];
let pagesVisited = [];


let HEADERS = {/*'Authorization': 'Basic #################'*/};



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
    array = string.split('undefined').join('').split('\n');
   /* await mkdirp('finishedscrapes/'+msg.from.first_name, function(err) { 
        if (err) fs.mkdir('finishedscrapes/'+msg.from.first_name);
    });
    await fs.writeFile(fileToWrite, string, (err) => {
      if (err) throw (err);  
    });*/
    await console.log(msg.from.id);
    let stringCounter = 0;
    let stringArray = [];
    while (array.length > 0) {
        if(stringCounter == 50) {
            stringArray.push(array.splice(0,50));
            stringCounter == 0;
        }
        if (array.length < 50) {
            stringArray.push(array);
            break;
        }
        console.log(stringArray);
        stringCounter++;
    }
    await console.log(stringArray);
    for (var item of stringArray) {
        await process.send([msg, item.join('\n')]);
    }
    try{
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
    if (counter%85 == 0 && counter > 10) {
        //await msg.reply.text('Working...');
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

initBrowser(msg);

});