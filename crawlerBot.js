
const TeleBot = require("telebot");
const { fork } = require('child_process');
const child = fork('./worker.js');
const bot = new TeleBot('');

bot.on('/start', (msg) => {
   msg.reply.text('Format: "password:######;domain:domain.com;start_page:www.domain.com;ignore_paths:path1,path2,path3;" \n ignore_paths not necessary.'); 
});

bot.on('text', (msg) => {
    if(msg.text !== '/start') {
        let msgArr = msg.text.split(';');
        let ignorePaths = [];
        let DOMAIN = msgArr.filter(function(item){
            return item.toLowerCase().includes('domain'); 
        });
        let STARTURL = msgArr.filter(function(item){
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
        let fileToWrite='finishedscrapes/'+msg.from.first_name+'/'+DOMAIN+'.txt';
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
        let message = [msg, DOMAIN, STARTURL, fileToWrite, ignorePaths];    
    child.send(message);    
    }
});

child.on('message', (idStringArray) => {
    bot.sendMessage(idStringArray[0].from.id, idStringArray[1]);
});

bot.start();
