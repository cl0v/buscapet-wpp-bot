const { Client, NoAuth, LocalAuth } = require('whatsapp-web.js');


let toctocPending = false

let pendingImpoPar = {
    number: 0,
    pending: false,
    choice: 'Par'
}



const client = new Client(
    {
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
        authStrategy: new LocalAuth()
    }
);

let isConnected = false

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
});



client.on('ready', () => {
    console.log('Client is ready!');
    isConnected = true
    // play()
});

client.on('disconnected', () => {
    isConnected = false
})


function isEven(n) {
    return n % 2 == 0;
}

function isOdd(n) {
    return Math.abs(n % 2) == 1;
}

client.on('message', async msg => {
    if (pendingImpoPar['pending']) {
        pendingImpoPar['pending'] = false
        let number = Math.floor(msg.body)
        let choice = pendingImpoPar['choice']
        let n = pendingImpoPar['number']

        if(msg.from.includes('553388765192')){
            await msg.reply('Ganhou! Pq vc sempre ganha meu amor!')
            return
        }

        if (choice == 'Par'.toLowerCase()) {
            if (isOdd(number+n)) await msg.reply('Ganhou!')
            if (isEven(number+n)) await msg.reply('Perdeu!')
        } else {
            if (isOdd(number+n)) await msg.reply('Perdeu!')
            if (isEven(number+n)) await msg.reply('Ganhou!')
        }
    }
    if (toctocPending) {
        toctocPending = false
        msg.reply(msg.body + ' quem?')
    }
    if (msg.body == 'toc toc'.toLowerCase()) {
        toctocPending = true
        msg.reply('Quem é?')
    } else {
        toctocPending = false
    }
    if (msg.body == 'Par ou impar?'.toLowerCase()) {
        let choice = ['Par', 'Impar'][Math.floor(Math.random() * 2)]
        pendingImpoPar['choice'] = choice
        await msg.reply(choice)
        await sleep(500)
        await client.sendMessage(msg.from, '' + 3)
        await sleep(1000)
        await client.sendMessage(msg.from, '' + 2)
        await sleep(1000)
        await client.sendMessage(msg.from, '' + 1)
        await sleep(1000)

        let n = Math.floor(Math.random() * 10)

        pendingImpoPar['number'] = n
        pendingImpoPar['pending'] = true

        await sleep(1000)
        await client.sendMessage(msg.from, '' + n)
    }
    if (msg.body == 'ping'.toLowerCase()) msg.reply('pong');
    if (msg.body == 'Te Amo'.toLowerCase()) msg.reply('Te Amo mais!');
});

client.initialize()

async function play() {
    console.log('Client initialized');
    while (true) {
        await sleep(1000)

        if (!isConnected) {
            console.log('Aguardando conexão...')
            // continue
        }


        // let next = false

        // rl.question(`Next number? (y/n)`, name => {
        //     if (name.toLowerCase == 'n') {
        //         next = false
        //         rl.close();
        //     } else if (name.toLowerCase == 'y') {
        //         next = true
        //     } else {
        //         console.log('Enviando...')
        //         next = true
        //     }
        // });

        // if (!next) continue


        try {

            const wid = await client.getNumberId('553388765192'); // Exemplo de obtenção de wid
            // console.log('wid')
            // console.log(wid._serialized)

            if (!wid) {
                console.error('Invalid WID:', wid);
                return;
            }

            await client.sendMessage(wid._serialized, 'Te Amo!')
            console.log('Mensagem enviada!')

        } catch (error) {
            console.log(error)
        }
    }
}


function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

