const Discord = require('discord.js');
const config = require('./config.json');
const client = new Discord.Client();

const ytdl = require('ytdl-core');
const search = require('youtube-search');

client.on('ready', () => {
 console.log('Estoy Listo!');
});

// Objeto 'queue' donde guardamos todas las canciones que agregaremos
const queue = new Map();

let prefix = config.prefix;

client.on('message', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  // Esta constante 'serverQueue' nos permitira saber si un servidor tiene una lista de musica reproduciendo.
  const serverQueue = queue.get(message.guild.id);

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  // <-- CODIGO CMD PLAY (REPRODUCIR): -->
  if(command === 'play') {
    const voiceChannel = message.member.voice.channel;

  //verificamos que el usuario solicitante este conectado en un canal de voz.
    if (!voiceChannel) return message.channel.send('¡Necesitas unirte a un canal de voz para reproducir música!');

    const permissions = voiceChannel.permissionsFor(message.client.user);

  //verificamos que el bot tenga permisos de conectar y de hablar en el canal de voz.
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.channel.send('¡Necesito permisos para unirme y hablar en el canal de voz!');
    }
  
  // <-- Capturamos la información de la música a reproducir -->
  var opts = {
    maxResults: 1, //Maximo de resultados a encontrar
    key: 'API-KEY-YOUTUBE', //Necesitas una CLAVE de la API de youtube. 
    type: "video" // Que tipo de resultado a obtener.
  };

  const songArg = await search(args.join(' '), opts);
  const songURL = songArg.results[0].link;
  const songInfo = await ytdl.getInfo(songURL);

  const song = {
    title: songInfo.title,
    url: songInfo.video_url,
    author: message.author.tag
  };

// <-- Verificamos la lista de canciones de un servidor -->

if (!serverQueue) {
	// Si NO hay una lista de música.
	// <-- Creamos nuestra cola de música a reproducir  -->
  
  }else {
	// Si HAY una lista de música reproduciendo.
  
	serverQueue.songs.push(song);
	console.log(serverQueue.songs);
	return message.channel.send(`**${song.title}** ha sido añadido a la cola!, __por: ${message.author.tag}__`);
  
  }
  // <-- Creamos nuestra cola de música a reproducir  -->

// Creamos el conjunto de datos para nuestra cola de música
const queueObject = {
	textChannel: message.channel, //guardamos el canal de texto
	voiceChannel: voiceChannel, // guardamos el canal de voz
	connection: null, // un objeto para la conexión 
	songs: [], // creamos la lista de canciones
	volume: 5, // volumen al iniciar la cola
	playing: true, // un objeto para validar la cola de música en reproducción.
   };
   
  // <-- Establecer la cola de música  -->

// Creando el conjunto de datos para nuestra cola de música
queue.set(message.guild.id, queueObject);

// Agregamos las canciones al conjunto de datos
queueObject.songs.push(song);

// <-- Conectar al canal de voz  -->

try {
	// Aquí unimos el bot al canal de voz y guardar nuestra conexión en nuestro objeto.
	var connection = await voiceChannel.join();
	queueObject.connection = connection;
   
	message.channel.send(`Reproduciendo ahora: **${song.title}**`);
   
	// Llamar a la función de reproducción para comenzar una canción.
	play(message.guild, queueObject.songs[0]);
   
   } catch (err) {
   
	// Imprimir el mensaje de error si el bot no puede unirse al chat de voz
	console.log(err);
	queue.delete(message.guild.id);
	return message.channel.send(err);
   
	function play(guild, song) {
		const serverQueue = queue.get(guild.id);
		// verificamos que hay musica en nuestro objeto de lista
		if (!song) {
		 serverQueue.voiceChannel.leave(); // si no hay mas música en la cola, desconectamos nuestro bot
		 queue.delete(guild.id);
		 return;
		}
	   
		// <-- Reproducción usando play()  -->

 const dispatcher = serverQueue.connection.play(ytdl(song.url))
 .on('finish', () => {
   // Elimina la canción terminada de la cola.
   serverQueue.songs.shift();

   // Llama a la función de reproducción nuevamente con la siguiente canción
   play(guild, serverQueue.songs[0]);
 })
 .on('error', error => {
  console.error(error);
 });

 // Configuramos el volumen de la reproducción de la canción
 dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
 	   }	   
   }

  }


  // <-- CODIGO CMD SKIP (SALTAR): -->

  if(command === 'skip') {
	// Aquí verificamos si el usuario que escribió el comando está en un canal de voz y si hay una canción que omitir.
	if (!message.member.voice.channel) return message.channel.send('debes unirte a un canal de voz.');
	// Aquí verificamos si el objeto de la lista de canciones esta vacía.
	if (!serverQueue) return message.channel.send('¡No hay canción que saltar!, la cola esta vacía');
 
	// Finalizamos el dispatcher
	await serverQueue.connection.dispatcher.destroy();
	message.channel.send(`Reproduciendo ahora: **${serverQueue.songs[1].title}**`);
   }
 
  // <-- CODIGO CMD STOP (DETENER): -->

  if(command === 'stop') {
	if (!message.member.voice.channel) return message.channel.send('Debes unirte a un canal de voz para detener la canción.');
	if (!serverQueue) return message.channel.send('¡No hay canción!, la cola esta vacía.');
	// Aquí borramos la cola de las canciones agregadas
	serverQueue.songs = [];
 
	// Finalizamos el dispatcher
	await serverQueue.connection.dispatcher.end();
	message.channel.send('Lista de canciones fue detenida.')
 
   }
 

  // <-- CODIGO CMD VOLUMEN (VOLUMEN): -->

  if(command === 'volumen') {
	// Validamos si la cola esta vacía 
	if (!serverQueue) return message.channel.send('¡No hay canción!, la cola esta vacía.');
	if(!args.join(' ')) return message.channel.send('Agrege el volumen entre **1 a 100%**')
 
	// Creamos una variable para el porcentaje del volumen
	let countVolumen = parseInt(args[0]);
	
	if (countVolumen < 100) {
	 let dispatcher = serverQueue.connection.dispatcher;
 
	 // Modificamos el volumen de la canción en reproducción
	 await dispatcher.setVolume(Math.min((dispatcher.volume = countVolumen / 50)))
 
	 message.channel.send(`**Volume:** \`${Math.round(dispatcher.volume*50)}\`**%**`)
 
	} else {
	 message.channel.send('El volumen debe estar entre **1 a 100%**')
 
	}
   
   }
 

  // <-- CODIGO CMD PAUSAR (PAUSE): -->

  if(command === 'pause') {
	// Validamos si la cola esta vacía 
	if (!serverQueue) return message.channel.send('¡No hay canción!, la cola esta vacía.');
	if (!message.member.voice.channel) return message.channel.send('debes unirte a un canal de voz.');
 
	// Pausamos la canción en reproducción
	await serverQueue.connection.dispatcher.pause();
   
	message.channel.send(`Canción actual en pausa.`)
   
   }
 

  // <-- CODIGO CMD RESUME (RESUME): -->

  if(command === 'resume') {
	// Validamos si la cola esta vacía 
	if (!serverQueue) return message.channel.send('¡No hay canción!, la cola esta vacía.');
 
	if (!message.member.voice.channel) return message.channel.send('debes unirte a un canal de voz.');
 
	// Reanudamos la canción pausada
	await serverQueue.connection.dispatcher.resume();
   
	message.channel.send(`Canción actual reanudada.`)
   
   }

  // <-- CODIGO CMD QUEUE (QUEUE): -->
 if(command === 'queue') {

    if (!serverQueue) return message.channel.send('¡No hay canción que mostrar!, la cola esta vacía');
    let i = 1

    // Listamos las canciones de la cola
    let list = serverQueue.songs.slice(1).map((m) => {
        if(i > 16) return // Lista solo 15 canciones
        i++;
        return `[${i}] - 🎵 ${m.title}  / 👤 por: ${m.author}` // Construimos la info por cada canción
            
       }).join('\n')
        
     let hr = "---------------------------------------------"
     // El tiempo de reproduccion de la canción
     let time = Math.trunc(serverQueue.connection.dispatcher.streamTime / 1000)
     
     // Agregarmos la canción actual reproduciendo
     let playName = `${hr}\n🔊 Ahora: ${serverQueue.songs[0].title}\n🕐 Tiempo: ${time} segundos.\n👤 Por: ${serverQueue.songs[0].author}\n${hr}`
     // La cantidad de canciones encontradas
     let countSong = `\n${hr}\n📒 Lista ${serverQueue.songs.length}/15 canciones.`
     
     message.channel.send('```xl\n[LISTA DE CANCIONES PARA: '+message.guild.name.toUpperCase()+']\n'+playName+'\n\n'+ list +'\n'+countSong+'\n```')

 }


})

client.login(config.token);

// <-- FUNCION PLAY (REPRODUCIR): -->
