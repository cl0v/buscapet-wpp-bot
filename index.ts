import { Poll, Chat, Client, Message, LocalAuth, MessageMedia, NoAuth } from 'whatsapp-web.js';

// TODO: Verificar se o usuario que iniciou a conversa, caso contrário ignora o chat por completo
// TODO: ADVANCED: Fazer mais opcoes de cores por raca
// TODO: Melhorar o texto de genero


const DEBUG = true

enum ChatSteps {
    Intro,
    Breed,
    Kennel,
    Color,
    Gender,
    TalkToAtandant,
    Audio,
    Idle,
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
    index: number
}

// Chat ID => Step counter
let users = new Array<User>()


client.on('message', async (msg) => {
    // if (msg.from != '553398744781@c.us') return
    // Não faz nada caso seja um grupo (Passar esse parametro pro objeto, para que não faca em toda iteração)
    let chat = await msg.getChat()
    if (chat.isGroup) return;


    // [DEBUG] Reseta a conversa
    // if (msg.body == 'lores2') {
    if (msg.body == 'voltar') {
        let index = users.findIndex(x => x.id == msg.from)
        users.splice(index, 1)
        return
    }

    let msgs = await chat.fetchMessages({ limit: 3, fromMe: true })

    let user = users.find(x => x.id == msg.from) ?? { id: msg.from, step: ChatSteps.Intro, index: 0 }

    // Adiciona o cliente a lista de atendimentos 
    if (!users.find(x => x.id == user.id)) {
        users.push(user)
    }

    // Verifica se é o início de uma interação
    if (msgs.length >= 3 && user == undefined && msg.body != 'oi') {
        return
    }

    console.log(`UserID: ${msg.from} | Text: ${msg.body} | Step: ${user.step} | Index: ${user.index}`)

    if (user.step === ChatSteps.Intro) {
        await fakeTyping(msg, chat)
        await client.sendMessage(msg.from, introText)
        user.step = ChatSteps.Breed
    }
    if (user.step === ChatSteps.Breed) {
        await fakeTyping(msg, chat)
        await showBreedListStep(user, msg)
    }
    if (user.step === ChatSteps.Color) {
        await fakeTyping(msg, chat)
        await dealWithColorStep(user, msg)
    }
    if (user.step === ChatSteps.Gender) {
        await fakeTyping(msg, chat)
        await dealWithGender(msg)
    }
    if (user.step === ChatSteps.TalkToAtandant) {
        await fakeTyping(msg, chat)
        await client.sendMessage(msg.from, talkToAtandant)
        user.step = ChatSteps.Audio
    }
    if (user.step === ChatSteps.Audio) {
        await fakeTyping(msg, chat)
        sendAudioToBegin(msg)
        user.step = ChatSteps.Idle
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


// Simula a digitacao
async function fakeTyping(msg: Message, chat: Chat, time: number = 1000) {
    client.sendSeen(msg.from)
    await chat.sendStateTyping()
    await sleep(time)
}

async function showBreedListStep(user: User, msg: Message) {
    let text = ''

    if (user.index == 0) {
        text = breedListText
    } else {
        let n = Number.parseInt(msg.body)
        if (isNaN(n)) {
            text = invalidOptionText
        }

        if (n > 0 && n < 9) {
            user.step = ChatSteps.Color
            user.index = 0
            return
        } else if (n == 0) {
            user.step = ChatSteps.TalkToAtandant
            return;
        } else if (n == 9) {
            user.step = ChatSteps.Idle
            text = freeBreedChoiseText
        } else {
            text = invalidOptionText
        }
    }

    await client.sendMessage(msg.from, text)
    user.index += 1
}

async function dealWithColorStep(user: User, msg: Message) {
    let n = Number.parseInt(msg.body)

    let breed = breeds.find(x => x.id == n)!
    if (breed.colors.length < 3) {
        user.step = ChatSteps.Gender
        return
    }

    let text = getColorsText(breed.breed, breed.colors)

    let media: MessageMedia | undefined = MessageMedia.fromFilePath(`imgs/${breed.imgPath}`);

    if (user.index == 1) {
        switch (n) {
            case 1:
            case 2:
            case 3:
                user.step = ChatSteps.Gender
                user.index = 0
                return
            case 4:
            default:
                text = freeColorChoiseText
                media = undefined
        }

    } else {
        user.index += 1
    }

    await client.sendMessage(msg.from, text, { media: media })
}


async function dealWithGender(msg: Message) {
    let text = `Por fim, escolha o *SEXO*:

1️⃣ *Macho*
2️⃣ *Fêmea*
3️⃣ *Voltar ao início*
`
    await client.sendMessage(msg.from, text)
}

/// Inicia o atendimento.
/// (Limit to timestamp) from 8:00 to 19:00
async function sendAudioToBegin(msg: Message) {
    await sleep(10000)
    let media = MessageMedia.fromFilePath('audios/atendimentoiniciado.ogg');
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


const talkToAtandant = 'Irei te encaminhar para um representante, aguarde um momento por favor.';
const invalidOptionText = 'Opcão inválida! Por favor, tente novamente.';
const introText = `*🌟 Bem-vindo(a)! 🌟*

Olá, sou a *Mel*, a assistente virtual do *buscapet*. Irei te ajudar a encontrar seu filhote!

> “Um filhote enche a casa de alegria e amor, transformando os dias em momentos especiais.” 🐾`


const breedListText =
    `*Para começar, me diga qual raça você busca:*

1️⃣ *Spitz* (Lulu da Pomerânia)  
2️⃣ *Golden Retriever*  
3️⃣ *Buldogue Francês*  
4️⃣ *Pug*  
5️⃣ *Yorkshire terrier*
6️⃣ *Rottweiler*
7️⃣ *Border Collie*
8️⃣ *Shih-Tzu*
9️⃣ *Outros* (mais raças)

0️⃣ Sou *criador* e gostaria de anunciar meus filhotes.

📩 _Digite de 0 a 9 para selecionar as opções acima._`;

let freeBreedChoiseText = 'Informe a raça que deseja para prosseguir:';

function getColorsText(breed: string, colors: Array<string>) {
    return `Agora escolha a *COR* do pelo para seu *${breed}*:
            
1️⃣ _*${colors[0]}*_
2️⃣ _*${colors[1]}*_
3️⃣ _*${colors[2]}*_

4️⃣ _*Outras*_

_Os filhotes da imagem são apenas para referência. Digite o número respectivo as opções acima._`;
}

const colorListText = `Agora escolha a *COR* do pelo para seu *Lulu da Pomerânia*:
            
1️⃣ _*Preto*_
2️⃣ _*Creme*_
3️⃣ _*Branco*_

4️⃣ _*Outras*_

_Os filhotes da imagem são apenas para referência. Digite o número respectivo as opções acima._`

const freeColorChoiseText = 'Informe a cor que deseja para prosseguir:';

var breeds = [
    { imgPath: "lulu.jpeg", id: 1, breed: "Lulu da Pomerânia", colors: ["Preto", "Creme", "Branco"] },
    { imgPath: "golden.png", id: 2, breed: "Golden Retriever", colors: ["Dourado Escuro", "Dourado Claro", "Creme"] },
    { imgPath: "buldogue.png", id: 3, breed: "Buldogue Francês", colors: ["Preto", "Marrom", "Branco*"] },
    { imgPath: "pug.png", id: 4, breed: "Pug", colors: ["Preto", "Abricot", "Prateado"] },
    { imgPath: "", id: 5, breed: "Yorkshire terrier", colors: [] },
    { imgPath: "", id: 6, breed: "Rottweiler", colors: [] },
    { imgPath: "border.png", id: 7, breed: "Border Collie", colors: ["Preto & Branco", "Marrom & Branco", "Azul & Branco"] },
    { imgPath: "shihtzu.png", id: 8, breed: "Shih-Tzu", colors: ["Branco", "Branco & Preto", "Branco & Fígado"] },
]
