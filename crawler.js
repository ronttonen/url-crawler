const puppeteer = require('puppeteer');
const fs = require('fs');

const MAX_PAGES = 1000;
let counter = 0;

const pagesToVisit = [];
const pagesVisited = [];

const DOMAIN = '/*domain.com*/';
const STARTURL = '/*https://www.domain.com*/';

const fileToWrite = 'linkit.txt';

const HEADERS = {/*'Authorization': 'Basic #################'*/};

const ignorePaths = [];

const wait = false;
const waitTime = 2000;

const scroll = false;
const scrollCounter = 1;

const filterPaths = false;
const pathsToUse = [];



async function initBrowser()  {
    

    const browser = await puppeteer.launch({
                        ignoreHTTPSErrors: true
                    });
    const page = await browser.newPage();
    await startSpider(STARTURL, browser, page);
}


async function writeToFile(array) {
    let string;
    array.sort();
    for (var key of array) {
        string += key + '\n';
    }
    await fs.writeFile(fileToWrite, string, (err) => {
      if (err) throw (err);  
    })
    
}



async function startSpider(startUrl, browser, page) {

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

    await crawl(browser, page);
    
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

function crawl(browser, page) {
     if (typeof pagesToVisit.pop() == "undefined" || counter == MAX_PAGES) {
        printResults(browser, pagesVisited);
        return;
    }
    try {
    var nextPage = removeAnchorAndParameter(pagesToVisit.pop());
    
    if (!nextPage.includes(DOMAIN) || isPicture(nextPage) || nextPage.includes('mailto')
    || pagesVisited.includes(removeFileTagAndDomain(nextPage, DOMAIN)) || checkIgnore(nextPage)) {
        crawl(browser, page);
    } else if (filterPaths) {
        for (const item of pathsToUse) {
            if(nextPage.includes(item)) {
                visitPage(nextPage, crawl, browser, page);
            } else {
                crawl(browser, page);
            }
        }
    }
    else if (typeof nextPage != "undefined") {
        visitPage(nextPage, crawl, browser, page);
    }
    } catch (err) {
        crawl(browser, page);
    }
}

async function visitPage(url, callback, browser, page) {

   
    try{
    await page.goto(url, {waitUntil: "networkidle2"});
    }
    catch (err) {
    callback(browser, page);
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
    await counter++;
    await callback(browser, page);
   
}
function printResults(browser, result) {
    console.log(result);
    writeToFile(result);
    browser.close();
    console.log('done');
}

initBrowser();