import { Client, Message, LocalAuth, MessageMedia, MessageSendOptions } from 'whatsapp-web.js';

const DEBUG = true

enum ChatSteps {
    Intro,
    Breed,
    Kennel,
    Color,
    Gender,
    TalkToAtandant,
    Audio
}

const client = new Client(
    {
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
        authStrategy: new LocalAuth()
    }
);


interface User {
    id: string,
    step: ChatSteps,
    innerStep: number | undefined,
    pending: boolean,
    inProgress: boolean,
}

// Chat ID => Step counter
let users = new Array<User>()


client.on('message', async (msg) => {
    if (msg.from != '553398744781@c.us') return
    let chat = await msg.getChat()
    if (chat.isGroup) return;

    client.sendSeen(msg.from)
    await chat.sendStateTyping()
    await sleep(500)
    

    let msgs = await chat.fetchMessages({ limit: 3, fromMe: true })

    let user = users.find(x => x.id == msg.from)

    // Verifica se é o início de uma interação
    if (msgs.length >= 3 && user == undefined && msg.body != 'oi') {
        return
    }

    // [DEBUG] Reseta a conversa
    if (msg.body == 'lores2') {
        let index = users.findIndex(x => x.id == msg.from)
        users.splice(index, 1)
    }

    // Adiciona o cliente a lista de atendimentos 
    if (user == undefined || msg.body == 'lores2') {
        let _initUser = { id: msg.from, step: ChatSteps.Intro, innerStep: undefined, pending: false, inProgress: true, }
        let _idx = users.push(_initUser)
        user = users[_idx - 1]
    }

    console.log(`UserID: ${msg.from} | Text: ${msg.body} | Step: ${user.step} | Response Pending: ${user.pending}`)

    if (user.step === ChatSteps.Intro) {
        await client.sendMessage(msg.from, introText)
        user.step = ChatSteps.Breed
    }
    if (user.step === ChatSteps.Breed) {
        await showBreedListStep(user, msg)
    }
    if (user.step === ChatSteps.Color) {
        await dealWithColorStep(msg)
    }
    if (user.step === ChatSteps.Gender) {
        await dealWithGender(msg)
    }
    if (user.step === ChatSteps.TalkToAtandant) {
        await client.sendMessage(msg.from, talkToAtandant)
    }
    if (user.step === ChatSteps.Audio) {
        sendAudioToBegin(msg)
    }
})

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
});



client.on('ready', () => {
    console.log('Client is ready!');
});


client.initialize()


async function showBreedListStep(user: User, msg: Message) {
    let text = ''
    if (!user.pending) {
        user.pending = true
        text = `*Pra começar me diga qual raça você busca:*
[1] Spitz ou Lulu da Pomerânia
[2] Golden Retriever
[3] Poodle
[4] Pug
[5] Outros (mais raças)

_Digite de 1 a 5 para selecionar as opções acima._ 

[0] Sou *criador* e gostaria de anunciar meus filhotes.`
    } else {
        let n = Number.parseInt(msg.body)
        //TODO: Checkar se pode ser a raca digitada
        if (isNaN(n)) {
            text = invalidOptionText
        } else {
            switch (n) {
                case 1:
                case 2:
                case 3:
                case 4:
                    user.step = ChatSteps.Color
                    return await dealWithColorStep(msg)
                case 5:
                    text = 'Informe a raça que deseja para prosseguir:'
                    break;
                case 0:
                    text = talkToAtandant
                    break;
                default:
                    user.step = ChatSteps.TalkToAtandant
                    break;
            }
        }

    }
    await client.sendMessage(msg.from, text)

}

async function dealWithColorStep(msg: Message) {
    let text = `Agora escolha a *cor* do pelo para seu filhote de *Lulu da Pomerânia*:
        
[1] Preta
[2] Creme
[3] Branca

_Os filhotes da imagem são apenas para referência. Digite o número respectivo as opções acima._`

    let media = MessageMedia.fromFilePath('lulu.jpeg');

    await client.sendMessage(msg.from, text, { media: media })
}


async function dealWithGender(msg: Message) {
    let text = `Por fim, escolha o *sexo* do seu filhote:

[1] Macho
[2] Fêmea
[3] Voltar ao início
`

    await client.sendMessage(msg.from, text)
}

/// Inicia o atendimento.
/// (Limit to timestamp) from 8:00 to 19:00
async function sendAudioToBegin(msg: Message) {
    await sleep(10000)
    let media = MessageMedia.fromFilePath('./atendimentoiniciado.ogg');
    let chat = await msg.getChat()
    await chat.sendStateRecording()
    await sleep(8000)
    client.sendMessage(msg.from, media, { sendAudioAsVoice: true })
}



function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


const talkToAtandant = 'Irei te encaminhar para um representante, aguarde um momento por favor.'
const invalidOptionText = 'Opcão inválida! Por favor, tente novamente.'
const introText = 'Olá, sou a *Mel*, a assistente virtual do *buscapet*. Irei te ajudar a encontrar seu filhote!' 