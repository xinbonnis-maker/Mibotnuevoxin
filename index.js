const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const PREFIX = "arlec";
const OWNER_ID = "1509368751911604327"; // ⚠️ CAMBIA ESTO POR TU ID
const DB_FILE = "usuarios.json";

let DB = {};
if (fs.existsSync(DB_FILE)) {
  DB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function guardarDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
}

client.once('ready', () => {
  console.log(`Bot ${client.user.tag} online - Modo Owner`);
  client.user.setActivity('Solo mi jefe me usa');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.toLowerCase().startsWith(PREFIX)) return;

  if (message.author.id!== OWNER_ID) {
    return message.reply("❌ Solo mi creador puede darme órdenes.");
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "decir") {
    const texto = args.join(" ");
    const adjunto = message.attachments.first();
    if (!texto &&!adjunto) {
      return message.reply("Escribe algo o sube una imagen: `arlec decir hola` + imagen adjunta");
    }
    if (adjunto) {
      await message.channel.send({ content: texto || null, files: [adjunto] });
    } else {
      await message.channel.send(texto);
    }
    try { await message.delete(); } catch {}
  }

  else if (command === "guardar") {
    const user = message.mentions.users.first();
    const info = args.slice(1).join(" ");
    if (!user) return message.reply("Menciona a alguien: `arlec guardar @user dato`");
    if (!info) return message.reply("Escribe qué guardar: `arlec guardar @user cargo`");
    const guildId = message.guild.id;
    if (!DB[guildId]) DB[guildId] = {};
    if (!DB[guildId][user.id]) DB[guildId][user.id] = { notas: [] };
    DB[guildId][user.id].notas.push({
      texto: info,
      autor: message.author.username,
      fecha: new Date().toLocaleDateString('es-ES')
    });
    guardarDB();
    message.reply(`✅ Guardé info de ${user.username}: "${info}"`);
  }

  else if (command === "info") {
    const user = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(user.id);
    const guildId = message.guild.id;
    const datosDB = DB[guildId]?.[user.id]?.notas || [];
    const embed = new EmbedBuilder()
.setTitle(`Info de ${user.username}`)
.setThumbnail(user.displayAvatarURL())
.addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Cuenta creada", value: user.createdAt.toLocaleDateString('es-ES'), inline: true },
        { name: "Se unió al server", value: member?.joinedAt.toLocaleDateString('es-ES') || "No está en el server", inline: true },
        { name: "Roles", value: member?.roles.cache.map(r => r.name).join(", ") || "Ninguno" }
      )
.setColor("#FF5500");
    if (datosDB.length > 0) {
      const notasTexto = datosDB.map((n, i) => `**${i+1}.** ${n.texto} - *por ${n.autor} el ${n.fecha}*`).join("\n");
      embed.addFields({ name: "📝 Notas guardadas", value: notasTexto });
    } else {
      embed.addFields({ name: "📝 Notas guardadas", value: "No hay notas. Usa `arlec guardar @user texto`" });
    }
    message.reply({ embeds: [embed] });
  }

  else if (command === "dile") {
    const user = message.mentions.users.first();
    const texto = args.slice(1).join(" ");
    if (!user) return message.reply("Menciona a alguien: `arlec dile @Staff mensaje`");
    if (!texto) return message.reply("Escribe el mensaje: `arlec dile @user tu mensaje`");
    try {
      await user.send(`**📩 Mensaje de ${message.author.username} desde ${message.guild.name}:**\n>>> ${texto}`);
      message.reply(`✅ Mensaje enviado a ${user.username} por DM`);
    } catch (err) {
      message.reply("❌ No pude enviarle DM. Tiene los MD cerrados.");
    }
  }

  else if (command === "ban") {
    const userId = args[0];
    const razon = args.slice(1).join(" ") || "Sin razón especificada";
    if (!userId) return message.reply("Pon una ID: `arlec ban 123456789012345678 razón`");
    if (isNaN(userId)) return message.reply("Eso no es una ID válida. Solo números.");
    try {
      await message.guild.bans.create(userId, { reason: `Ban por ${message.author.username}: ${razon}` });
      message.reply(`🔨 Usuario con ID \`${userId}\` baneado del server.\n**Razón:** ${razon}`);
    } catch (err) {
      message.reply(`❌ Error al banear: ${err.message}\n¿El bot tiene permisos de Banear Miembros?`);
    }
  }

  else if (command === "borrar") {
    const user = message.mentions.users.first();
    if (!user) return message.reply("Menciona a alguien: `arlec borrar @user`");
    const guildId = message.guild.id;
    if (DB[guildId]?.[user.id]) {
      delete DB[guildId][user.id];
      guardarDB();
      message.reply(`🗑️ Borré todas las notas de ${user.username}`);
    } else {
      message.reply("Ese usuario no tiene notas guardadas");
    }
  }

  else if (command === "ayuda") {
    const embed = new EmbedBuilder()
.setTitle("Bot XIN - Comandos Privados")
.setDescription("**Solo mi owner puede usarme**")
.addFields(
        { name: "arlec decir <texto>", value: "Repito tu mensaje. Adjunta una imagen si quieres que la mande también" },
        { name: "arlec guardar @user <info>", value: "Guarda una nota sobre un usuario" },
        { name: "arlec info @user", value: "Muestra toda la info + notas de un usuario" },
        { name: "arlec borrar @user", value: "Borra todas las notas de un usuario" },
        { name: "arlec dile @user <mensaje>", value: "Manda DM a tu staff" },
        { name: "arlec ban <id> <razón>", value: "Banea a alguien por ID aunque no esté en el server" },
        { name: "arlec ayuda", value: "Muestra este mensaje" }
      )
.setColor("#FF0000");
    message.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
