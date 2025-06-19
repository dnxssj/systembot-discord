import './keep_alive.js';
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import { createCanvas, loadImage, registerFont } from 'canvas';

registerFont('./fonts/static/Roboto-Bold.ttf', { family: 'Roboto', weight: 'bold' });
registerFont('./fonts/static/Roboto-Light.ttf', { family: 'Roboto', weight: 'light' });

dotenv.config();
const config = JSON.parse(fs.readFileSync('./config.json'));
const xpFile = './xp.json';
let xpData = fs.existsSync(xpFile) ? JSON.parse(fs.readFileSync(xpFile)) : {};
const parejasFile = './parejas.json';
let parejasData = fs.existsSync(parejasFile) ? JSON.parse(fs.readFileSync(parejasFile)) : {};
const amistadesFile = './amistades.json';
let amistadesData = fs.existsSync(amistadesFile) ? JSON.parse(fs.readFileSync(amistadesFile)) : {};
const monedasFile = './monedas.json';
let monedas = {};
try {
  monedas = JSON.parse(fs.readFileSync(monedasFile));
} catch (err) {
  console.error('No se pudo cargar monedas.json:', err);
}


const getRequiredXp = lvl => Math.floor(Math.pow((lvl + 1) / 0.1, 2));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', async () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
  const channel = await client.channels.fetch(config.channelId);

  const activities = [
    { name: 'como Giova pierde su tiempo con randoms', type: 3 },
    { name: 'a clickar', type: 0 },
    { name: 'a Daniel ragear como desesperada', type: 2 }
  ];
  let i = 0;
  client.user.setPresence({ status: 'online', activities: [activities[i++ % activities.length]] });
  setInterval(() => {
    client.user.setPresence({ status: 'online', activities: [activities[i++ % activities.length]] });
  }, 1800000);

  if (!config.colorMessageId) {
    const embed = new EmbedBuilder()
      .setTitle('🎨 Colores de Nickname – Selección Actual')
      .setDescription('**Elige un color de nickname**:\n\n🔴 → rojo_coral\n🟠 → naranja_dorado\n🟣 → lila_vibrante\n🔵 → celeste_pastel\n🟢 → verde_menta\n🌸 → rosa_pastel\n⚫ → gris_carbon\n🤍 → blanco\n🟡 → amarillo_crema\n')
      .setColor(0x9b59b6);

    const msg = await channel.send({ embeds: [embed] });
    for (const emoji of Object.keys(config.colorRoles)) await msg.react(emoji);
    config.colorMessageId = msg.id;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot || !reaction.message.guild) return;
  const member = await reaction.message.guild.members.fetch(user.id);
  const { colorRoles } = config;
  if (reaction.message.id === config.colorMessageId) {
    const roleName = colorRoles[reaction.emoji.name];
    const role = reaction.message.guild.roles.cache.find(r => r.name === roleName);
    if (!role) return;
    for (const name of Object.values(colorRoles)) {
      const r = reaction.message.guild.roles.cache.find(ro => ro.name === name);
      if (r && member.roles.cache.has(r.id)) await member.roles.remove(r);
    }
    await member.roles.add(role).catch(console.error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot || !reaction.message.guild) return;
  const member = await reaction.message.guild.members.fetch(user.id);
  const roleName = config.colorRoles[reaction.emoji.name];
  const role = reaction.message.guild.roles.cache.find(r => r.name === roleName);
  if (role && member.roles.cache.has(role.id)) await member.roles.remove(role).catch(console.error);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  const authorId = message.author.id;

  // Comando !help
  if (message.content === '!help') {
    const embed = new EmbedBuilder()
      .setTitle('📖 Lista de comandos disponibles')
      .setColor(0x00bfff)
      .setDescription(`
  **Generales**
  \`!help\` → Muestra esta ayuda  
  \`!rank\` → Muestra tu nivel y XP  
  \`!me\` → Muestra tu perfil visual  
  \`!relacion\` → Muestra tu pareja y tu mejor amig@
  \`!tienda\` → Muestra la tienda del servidor, en la que puedes adquirir efectos y títulos para tu perfil
  
  **Server Booster**
  \`!booster\` → Agradecimiento especial a boosters  
  \`!claim\` → Reclama XP y monedas diariamente (solo boosters)  
  **Relaciones**
  \`!marryme @usuario\` → Solicitar relación  
  \`!divorce\` → Pedir divorcio  
  \`!bffme @usuario\` → Elegir mejor amig@

  **🎨 Roles por color**
  Reacciona al mensaje de colores para cambiar el color de tu nickname.


  ⚙️ *Algunos comandos solo están disponibles si tienes ciertos roles.*
      `)
      .setFooter({ text: 'Dexter Bot • por DNX' });

    message.channel.send({ embeds: [embed] });
  }


  if (message.content === '!backup') {
    const allowedIds = [process.env.ADMIN_ID_1];
    if (!allowedIds.includes(authorId)) {
      return message.reply('🚫 Este comando es solo para administradores autorizados.');
    }

    const archivos = ['xp.json', 'parejas.json', 'amistades.json', 'claimCooldowns.json'].filter(file =>
      fs.existsSync(`./${file}`)
    );

    if (archivos.length === 0) return message.reply('📁 No hay archivos para respaldar.');

    try {
      await message.author.send({
        content: '📦 Aquí tienes los archivos de backup actuales:',
        files: archivos.map(file => ({
          attachment: `./${file}`,
          name: file
        }))
      });
      message.reply('✅ Backup enviado por mensaje privado.');
    } catch (error) {
      message.reply('❌ No pude enviarte el mensaje privado. ¿Tienes los DMs desactivados?');
    }
  }

const tienda = require('./tienda.json');
const ITEMS_PER_PAGE = 4;

if (message.content.startsWith('!tienda')) {
  const args = message.content.split(' ');
  const page = parseInt(args[1]) || 1;
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const totalPages = Math.ceil(tienda.items.length / ITEMS_PER_PAGE);

  const boosterRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('booster'));
  const isBooster = boosterRole && message.member.roles.cache.has(boosterRole.id);

  const itemsToShow = tienda.items.slice(start, end);

  if (itemsToShow.length === 0) return message.reply('📦 No hay ítems en esta página.');

  const embed = new EmbedBuilder()
    .setTitle('🛒 Tienda del Servidor')
    .setColor(0x00bfff)
    .setFooter({ text: `Página ${page} de ${totalPages}` });

  for (const item of itemsToShow) {
    let rareColor = {
      "común": '🟢',
      "raro": '🔵',
      "épico": '🟣',
      "legendario": '🟠'
    }[item.rareza.toLowerCase()] || '⚪';

    let linea = `**${rareColor} ${item.nombre}**\n💰 Precio: ${item.precio} monedas\n📦 Tipo: ${item.tipo}`;
    if (item.boosterOnly) linea += '\n🔒 Exclusivo para boosters';

    embed.addFields({ name: '\u200b', value: linea });
  }

  message.channel.send({ embeds: [embed] });
}


  if (message.content.startsWith('!buy')) {
  const args = message.content.split(' ');
  const idItem = args[1];

  if (!idItem) return message.reply('❗ Especifica el ID del objeto.');

  const tienda = JSON.parse(fs.readFileSync('./tienda.json', 'utf8'));
  const monedas = JSON.parse(fs.readFileSync('./monedas.json', 'utf8'));
  const inventario = JSON.parse(fs.readFileSync('./inventario.json', 'utf8'));

  const userId = message.author.id;
  const item = tienda[idItem];
  if (!item) return message.reply('❌ Ese objeto no existe en la tienda.');

  if (!monedas[userId] || monedas[userId] < item.precio)
    return message.reply('🚫 No tienes suficientes monedas.');

  if (!inventario[userId]) inventario[userId] = [];
  if (inventario[userId].includes(idItem))
    return message.reply('⚠️ Ya tienes este objeto.');

  monedas[userId] -= item.precio;
  inventario[userId].push(idItem);

  fs.writeFileSync('./monedas.json', JSON.stringify(monedas, null, 2));
  fs.writeFileSync('./inventario.json', JSON.stringify(inventario, null, 2));

  message.reply(`✅ Has comprado **${item.nombre}** por ${item.precio} monedas.`);
  }

  if (message.content.startsWith('!inv')) {
    const target = message.mentions.users.first() || message.author;
    const targetId = target.id;

    const datosInventario = JSON.parse(fs.readFileSync('./inventario.json', 'utf-8'));
    const inventario = datosInventario[targetId];

    if (!inventario || (!inventario.efectos?.length && !inventario.titulos?.length)) {
      return message.reply(`🧺 ${target.username} no tiene ítems en su inventario.`);
    }

    const efectos = inventario.efectos?.length ? inventario.efectos.map(e => `✨ ${e}`).join('\n') : 'Ninguno';
    const titulos = inventario.titulos?.length ? inventario.titulos.map(t => `🏷️ ${t}`).join('\n') : 'Ninguno';

    const embed = new EmbedBuilder()
      .setTitle(`🎒 Inventario de ${target.username}`)
      .setColor(0x00bfff)
      .addFields(
        { name: '🎨 Efectos visuales', value: efectos, inline: false },
        { name: '🏷️ Títulos', value: titulos, inline: false }
      )
      .setFooter({ text: `Usa !me para mostrar tus ítems activos.` });

    await message.reply({ embeds: [embed] });
  }

  if (message.content.startsWith('!equipar')) {
  const args = message.content.split(' ');
  const tipo = args[1]?.toLowerCase();
  const nombre = args.slice(2).join(' ');

  if (!['titulo', 'efecto'].includes(tipo)) {
    return message.reply('❌ Usa el comando así: `!equipar titulo NOMBRE` o `!equipar efecto NOMBRE`.');
  }

  if (!nombre) {
    return message.reply('❌ Debes especificar el nombre del ítem que quieres equipar.');
  }

  const userId = message.author.id;
  const inventario = JSON.parse(fs.readFileSync('./inventario.json', 'utf-8'));
  const equipados = JSON.parse(fs.readFileSync('./equipados.json', 'utf-8'));

  const userInv = inventario[userId];
  if (!userInv || !userInv[`${tipo}s`] || !userInv[`${tipo}s`].includes(nombre)) {
    return message.reply(`❌ No tienes ese ${tipo} en tu inventario.`);
  }

  if (!equipados[userId]) equipados[userId] = {};
  equipados[userId][tipo] = nombre;

  fs.writeFileSync('./equipados.json', JSON.stringify(equipados, null, 2));
  message.reply(`✅ Has equipado el ${tipo} **${nombre}**.`);
  }



  
  if (message.content.startsWith('!rank')) {
    const target = message.mentions.users.first() || message.author;
    const targetId = target.id;

    if (!xpData[targetId]) xpData[targetId] = { xp: 0, level: 0, lastRank: null };
    const userXp = xpData[targetId];
    const level = userXp.level;
    const getRequiredXp = lvl => Math.floor(Math.pow((lvl + 1) / 0.1, 2));
    const required = getRequiredXp(level);

    const progressBar =
      '▰'.repeat(Math.floor((userXp.xp / required) * 10)) +
      '▱'.repeat(10 - Math.floor((userXp.xp / required) * 10));

    const member = await message.guild.members.fetch(target.id);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Perfil de ${member.displayName}`)
      .addFields(
        { name: 'Nivel', value: `${level}`, inline: true },
        {
          name: 'XP',
          value: `\`${userXp.xp} / ${required}\`\n${progressBar}`,
          inline: true
        },
        { name: 'Rango', value: userXp.lastRank || 'Sin rango', inline: false }
      )
      .setColor(0x5865f2);

    message.reply({ embeds: [embed] });
  }


if (message.content.startsWith('!me')) {
  const targetUser = message.mentions.users.first() || message.author;
  const targetId = targetUser.id;

  if (!xpData[targetId]) xpData[targetId] = { xp: 0, level: 0, lastRank: null };
  const userData = xpData[targetId];
  const getRequiredXp = lvl => Math.floor(Math.pow((lvl + 1) / 0.1, 2));
  const requiredXp = getRequiredXp(userData.level);
  const progress = Math.min(userData.xp / requiredXp, 1);

  const member = await message.guild.members.fetch(targetId);
  const parejaId = parejasData[targetId];
  const pareja = parejaId ? (await message.guild.members.fetch(parejaId).catch(() => null))?.displayName || 'Desconocido' : 'Solter@';
  const bffId = amistadesData[targetId];
  const bff = bffId ? (await message.guild.members.fetch(bffId).catch(() => null))?.displayName || 'Sin mejor amig@' : 'Sin mejor amig@';

  const canvas = createCanvas(600, 600);
  const ctx = canvas.getContext('2d');

  //Booster
  const vipRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('vip'));
  const boosterRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('booster'));
  const isBooster = boosterRole && member.roles.cache.has(boosterRole.id) && !(vipRole && member.roles.cache.has(vipRole.id));


  let fondo;
  if (vipRole && member.roles.cache.has(vipRole.id)) {
    fondo = await loadImage('./me_background_vip_discord.png');
  } else if (isBooster) {
    fondo = await loadImage('./me_background_booster_discord.png');
  } else {
    fondo = await loadImage('./me_background_discord.jpg');
  }

ctx.drawImage(fondo, 0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;

  if (isBooster) {
    const insignia = await loadImage('./booster_badge.png');
    ctx.drawImage(insignia, cx + 40, 100, 32, 32);
  }

  const avatar = await loadImage(targetUser.displayAvatarURL({ extension: 'png', forceStatic: true, size: 128 }));
  const equipados = JSON.parse(fs.readFileSync('./equipados.json', 'utf-8'));
  const equipado = equipados[targetId] || {};
  const tituloEquipado = equipado.titulo || 'Sin título';
  const efectoEquipado = equipado.efecto || 'Sin efecto';


  ctx.save();
  ctx.beginPath();
  let borderColor = '#4A90E2'; // normal
  if (vipRole && member.roles.cache.has(vipRole.id)) borderColor = '#FFD700';
  else if (isBooster) borderColor = '#AC87FF';

  ctx.arc(cx, 110, 66, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();
  ctx.closePath();
  ctx.beginPath();
  ctx.arc(cx, 110, 64, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatar, cx - 64, 46, 128, 128);
  ctx.restore();

  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 36px Roboto';
  let displayName = member.displayName.toUpperCase();
if (boosterRole && member.roles.cache.has(boosterRole.id)) {
  displayName = `★ ${displayName} ★`;
}

  ctx.fillText(displayName, cx, 210);

  ctx.font = '22px Roboto';
  ctx.fillText(`🎖️ ${tituloEquipado}`, cx, 250);
  ctx.fillText(`💫 Efecto: ${efectoEquipado}`, cx, 280);
  ctx.fillText(`Nivel: ${userData.level}`, cx, 310);
  ctx.fillText(`XP: ${userData.xp}`, cx, 340);
  ctx.fillText(`Monedas: ${monedas[targetId] || 0}`, cx, 370);

  ctx.font = 'bold 22px Roboto';
  ctx.fillText(`Relación: ${pareja}`, cx, 410);
  ctx.fillText(`Mejor amig@: ${bff}`, cx, 440);



  const barWidth = 300;
  const barHeight = 24;
  const barX = (canvas.width - barWidth) / 2;
  const barY = 400;

  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  ctx.moveTo(barX + 12, barY);
  ctx.lineTo(barX + barWidth - 12, barY);
  ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + 12);
  ctx.lineTo(barX + barWidth, barY + barHeight - 12);
  ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - 12, barY + barHeight);
  ctx.lineTo(barX + 12, barY + barHeight);
  ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - 12);
  ctx.lineTo(barX, barY + 12);
  ctx.quadraticCurveTo(barX, barY, barX + 12, barY);
  ctx.closePath();
  ctx.fill();

  let barStartColor = '#7FB3D5'; // default (normal)
  let barEndColor = '#4A90E2';   // default (normal)

  if (vipRole && member.roles.cache.has(vipRole.id)) {
    barStartColor = '#FFD700';
    barEndColor = '#FFC107';
  } else if (isBooster) {
    barStartColor = '#AC87FF';
    barEndColor = '#7C4DFF';
  }
 
  const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  gradient.addColorStop(0, barStartColor);
  gradient.addColorStop(1, barEndColor);


  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(barX + 12, barY);
  ctx.lineTo(barX + barWidth * progress - 12, barY);
  ctx.quadraticCurveTo(barX + barWidth * progress, barY, barX + barWidth * progress, barY + 12);
  ctx.lineTo(barX + barWidth * progress, barY + barHeight - 12);
  ctx.quadraticCurveTo(barX + barWidth * progress, barY + barHeight, barX + barWidth * progress - 12, barY + barHeight);
  ctx.lineTo(barX + 12, barY + barHeight);
  ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - 12);
  ctx.lineTo(barX, barY + 12);
  ctx.quadraticCurveTo(barX, barY, barX + 12, barY);
  ctx.closePath();
  ctx.fill();

  ctx.font = '18px Roboto';
  ctx.fillStyle = '#000';
  ctx.fillText(`${userData.xp} / ${requiredXp}`, canvas.width / 2, barY + 17);

  const buffer = canvas.toBuffer('image/png');
  await message.reply({ files: [{ attachment: buffer, name: 'perfil.png' }] });
}


  // Parejas
  if (message.content.startsWith('!relacion')) {
  const targetUser = message.mentions.users.first() || message.author;
  const parejaId = parejasData[targetUser.id];
  const bffId = amistadesData[targetUser.id];

  const parejaName = parejaId
    ? (await message.guild.members.fetch(parejaId).catch(() => null))?.displayName || 'Desconocido'
    : 'Solter@';

  const bffName = bffId
    ? (await message.guild.members.fetch(bffId).catch(() => null))?.displayName || 'Sin mejor amig@'
    : 'Sin mejor amig@';

  const embed = new EmbedBuilder()
    .setTitle(`💖 Relaciones de ${targetUser.username}`)
    .setColor(0xff69b4)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: 'Relación', value: parejaName, inline: true },
      { name: 'Mejor amig@', value: bffName, inline: true }
    )
    .setFooter({ text: '¡Qué bonito! 🌸' });

  await message.reply({ embeds: [embed] });
}


  if (message.content.startsWith('!marryme')) {
    const boosterRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('booster'));
    const isBooster = boosterRole && message.member.roles.cache.has(boosterRole.id);

    if (!isBooster) {
      return message.reply('🚫 Este comando es exclusivo para boosters del servidor.');
    }
    const target = message.mentions.users.first();
    if (!target || target.bot || target.id === message.author.id) {
      return message.reply('❗ Menciona a una persona válida para casarte.');
    }

    const yaEmparejado = Object.entries(parejasData).some(([uid, pid]) =>
      [uid, pid].includes(message.author.id) || [uid, pid].includes(target.id)
    );
    if (yaEmparejado) {
      return message.reply('💔 Uno de los dos ya tiene pareja.');
    }

    const confirmMsg = await message.channel.send({
      content: `${target}, ${message.author} quiere ser tu pareja 💍\n¿Aceptas?`,
      embeds: [new EmbedBuilder().setColor(0xffc0cb).setDescription('Reacciona con ✅ o ❌')]
    });

    await confirmMsg.react('✅');
    await confirmMsg.react('❌');

    confirmMsg.awaitReactions({
      filter: (r, u) => ['✅', '❌'].includes(r.emoji.name) && u.id === target.id,
      max: 1,
      time: 60000,
      errors: ['time']
    }).then(collected => {
      const emoji = collected.first().emoji.name;
      if (emoji === '✅') {
        parejasData[message.author.id] = target.id;
        parejasData[target.id] = message.author.id;
        fs.writeFileSync(parejasFile, JSON.stringify(parejasData, null, 2));
        message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('💖 ¡Nueva pareja!')
            .setDescription(`✨ ${message.author} y ${target} ahora están junt@s 💕`)
            .setColor(0xff69b4)
            .setImage('https://media.tenor.com/SomCjpmjYgYAAAAC/inuyasha-shippo.gif')]
        });
      } else {
        message.channel.send('😢 Propuesta rechazada.');
      }
    }).catch(() => message.channel.send('⏰ Tiempo agotado.'));
  }
  if (message.content === '!divorce') {
    const boosterRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('booster'));
    const isBooster = boosterRole && message.member.roles.cache.has(boosterRole.id);

    if (!isBooster) {
      return message.reply('🚫 Este comando es exclusivo para boosters del servidor.');
    }

    const parejaId = parejasData[message.author.id];
    if (!parejaId) {
      return message.reply('❌ No estás en pareja actualmente.');
    }

    const pareja = await message.guild.members.fetch(parejaId).catch(() => null);
    if (!pareja) {
      delete parejasData[message.author.id];
      delete parejasData[parejaId];
      fs.writeFileSync(parejasFile, JSON.stringify(parejasData, null, 2));
      return message.reply('⚠️ Tu pareja ya no está en el servidor. Se ha terminado la relación.');
    }

    const confirmMsg = await message.channel.send({
      content: `${pareja}, ${message.author} quiere divorciarse de ti 💔\n¿Aceptas?`,
      embeds: [new EmbedBuilder().setColor(0x999999).setDescription('Reacciona con ✅ o ❌')]
    });

    await confirmMsg.react('✅');
    await confirmMsg.react('❌');

    confirmMsg.awaitReactions({
      filter: (r, u) => ['✅', '❌'].includes(r.emoji.name) && u.id === parejaId,
      max: 1,
      time: 60000,
      errors: ['time']
    }).then(collected => {
      const emoji = collected.first().emoji.name;
      if (emoji === '✅') {
        delete parejasData[message.author.id];
        delete parejasData[parejaId];
        fs.writeFileSync(parejasFile, JSON.stringify(parejasData, null, 2));
        message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('💔 Divorcio confirmado')
            .setDescription(`${message.author} y ${pareja} ya no están juntos.`)
            .setColor(0x808080)
            .setImage('https://media.tenor.com/yo88TJREroIAAAAC/divorce.gif')]
        });
      } else {
        message.channel.send('😢 El divorcio ha sido rechazado.');
      }
    }).catch(() => message.channel.send('⏰ Tiempo agotado.'));
  }


  // Amistades
  if (message.content.startsWith('!bffme')) {
    const boosterRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('booster'));
    const isBooster = boosterRole && message.member.roles.cache.has(boosterRole.id);

    if (!isBooster) {
      return message.reply('🚫 Este comando es exclusivo para boosters del servidor.');
    }

    const target = message.mentions.users.first();
    if (!target || target.bot || target.id === message.author.id) {
      return message.reply('❗ Menciona a una persona válida para ser mejores amig@s.');
    }

    const yaSonBffs = amistadesData[message.author.id] === target.id || amistadesData[target.id] === message.author.id;
    if (yaSonBffs) {
      return message.reply('💛 ¡Ya sois mejores amig@s!');
    }

    const confirmMsg = await message.channel.send({
      content: `${target}, ${message.author} quiere ser tu mejor amig@ 🌟\n¿Aceptas?`,
      embeds: [new EmbedBuilder().setColor(0xffd700).setDescription('Reacciona con ✅ o ❌')]
    });

    await confirmMsg.react('✅');
    await confirmMsg.react('❌');

    confirmMsg.awaitReactions({
      filter: (r, u) => ['✅', '❌'].includes(r.emoji.name) && u.id === target.id,
      max: 1,
      time: 60000,
      errors: ['time']
    }).then(collected => {
      const emoji = collected.first().emoji.name;
      if (emoji === '✅') {
        amistadesData[message.author.id] = target.id;
        amistadesData[target.id] = message.author.id;
        fs.writeFileSync(amistadesFile, JSON.stringify(amistadesData, null, 2));
        message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('🤝 ¡Nueva mejor amistad!')
            .setDescription(`${message.author} y ${target} ahora son mejores amig@s 🧡`)
            .setColor(0xffd700)]
        });
      } else {
        message.channel.send('😢 Solicitud de amistad rechazada.');
      }
    }).catch(() => message.channel.send('⏰ Tiempo agotado.'));
  }

  if (message.content === '!fixrank') {
  const userData = xpData[message.author.id];
  const level = userData.level;
  const rankRoles = {
    10: 'Rango 1 ~ Ruby Scrapper',
    50: 'Rango 2 ~ Passenger Level',
    100: 'Rango 3 ~ Fausto 2.0',
    200: 'Rango 4 ~ Un Darkblood',
    300: 'Rango 5 ~ Jugador Regular',
    400: 'Rango 6 ~ Jugador Playmaker',
    500: 'Rango 7 ~ Jugador Destacado',
    600: 'Rango 8 ~ Jugador Experto',
    800: 'Rango 9 ~ Campeón de Ruby',
    1000: 'Rango 10 ~ Leyenda de Ruby',
    5000: 'YAPPER',
    10000: 'GOAT'
  };

  const getRankName = lvl => {
    return Object.entries(rankRoles).reverse().find(([l]) => lvl >= l)?.[1] || null;
  };

  const rankName = getRankName(level);
  if (rankName) {
    const member = message.member;
    for (const r of Object.values(rankRoles)) {
      const role = message.guild.roles.cache.find(ro => ro.name === r);
      if (role && member.roles.cache.has(role.id)) await member.roles.remove(role);
    }

    const newRole = message.guild.roles.cache.find(r => r.name === rankName);
    if (newRole) {
      await member.roles.add(newRole);
      userData.lastRank = rankName;
      fs.writeFileSync(xpFile, JSON.stringify(xpData, null, 2));
      return message.reply(`🎖 Se te ha asignado el rol: **${rankName}**`);
    } else {
      return message.reply('⚠️ No se encontró el rol correspondiente en el servidor.');
    }
  }
}


  //For boosters only
  if (message.content === '!booster') {
    const boosterRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('booster'));
    if (!boosterRole || !message.member.roles.cache.has(boosterRole.id)) {
      return message.reply('🚫 Este comando es exclusivo para boosters del servidor.');
    }

    const embed = new EmbedBuilder()
      .setTitle('✨ ¡Gracias por boostear el servidor!')
      .setColor(0xf47fff)
      .setDescription(`⭐ ${message.member.displayName} ⭐\nGracias por apoyar este servidor con tu boost.\n\nPuedes usar el comando \`!claim\` una vez al día para reclamar XP adicional.`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Sistema de recompensas para boosters' });

    message.channel.send({ embeds: [embed] });
  }

  const claimCooldown = './claimCooldowns.json';
  let cooldowns = fs.existsSync(claimCooldown) ? JSON.parse(fs.readFileSync(claimCooldown)) : {};

  if (message.content === '!claim') {
    const boosterRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes('booster'));
    if (!boosterRole || !message.member.roles.cache.has(boosterRole.id)) {
      return message.reply('🚫 Solo los boosters pueden reclamar XP extra.');
    }

    const now = new Date().toDateString();
    if (!xpData[message.author.id]) xpData[message.author.id] = { xp: 0, level: 0, lastRank: null };

    const userData = xpData[message.author.id];
    if (userData.lastClaim === now) {
      return message.reply('🕒 Ya has reclamado tu XP extra hoy. Intenta mañana.');
    }

    const xpAmount = 150;
    const rewardCoins = 25;

    userData.xp += xpAmount;
    userData.lastClaim = now;
    fs.writeFileSync(xpFile, JSON.stringify(xpData, null, 2));

    const embed = new EmbedBuilder()
      .setTitle('🎉 ¡Recompensa reclamada!')
      .setColor(0x7d3cff)
      .setDescription(`Has reclamado **+${xpAmount} XP** y **+${rewardCoins} monedas** por ser booster del servidor.\n¡Gracias por tu apoyo, ${message.member.displayName}!`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

    message.channel.send({ embeds: [embed] });
  }



if (!message.content.startsWith('!')) {

  if (!xpData[authorId]) xpData[authorId] = { xp: 0, level: 0, lastRank: null };
  const userXp = xpData[authorId];

  userXp.xp += Math.floor(Math.random() * 10) + 5;
  monedas[authorId] = (monedas[authorId] || 0) + 5;
  cooldownMonedas.add(authorId);
  setTimeout(() => cooldownMonedas.delete(authorId), 5000);


  const level = Math.floor(0.1 * Math.sqrt(userXp.xp));
  const getRequiredXp = lvl => Math.floor(Math.pow((lvl + 1) / 0.1, 2));
  const rankRoles = { 10: 'Rango 1 ~ Ruby Scrapper', 50: 'Rango 2 ~ Passenger Level', 100: 'Rango 3 ~ Fausto 2.0', 200: 'Rango 4 ~ Un Darkblood', 300: 'Rango 5 ~ Jugador Regular', 400: 'Rango 6 ~ Jugador Playmaker', 500: 'Rango 7 ~ Jugador Destacado', 600: 'Rango 8 ~ Jugador Experto', 800: 'Rango 9 ~ Campeón de Ruby', 1000: 'Rango 10 ~ Leyenda de Ruby', 5000: 'YAPPER', 10000: 'GOAT' };
  const getRankName = lvl => {
    return Object.entries(rankRoles).reverse().find(([l]) => lvl >= l)?.[1] || null;
  };

  if (level > userXp.level) {
    userXp.level = level;
    const rankName = getRankName(level);
    const announce = await client.channels.fetch(config.levelUpChannelId).catch(() => null);
    if (announce) announce.send({ embeds: [new EmbedBuilder().setTitle('📈 ¡Nuevo nivel!').setDescription(`${message.author} subió a nivel **${level}**.`).setColor(0x00bfff)] });
    if (rankName && userXp.lastRank !== rankName) {
      const member = message.member;
      for (const r of Object.values(rankRoles)) {
        const role = message.guild.roles.cache.find(ro => ro.name === r);
        if (role && member.roles.cache.has(role.id)) await member.roles.remove(role);
      }
      const newRole = message.guild.roles.cache.find(r => r.name === rankName);
      if (newRole) await member.roles.add(newRole).catch(console.error);
      userXp.lastRank = rankName;
    }
  }
  fs.writeFileSync(xpFile, JSON.stringify(xpData, null, 2));
  fs.writeFileSync(monedasFile, JSON.stringify(monedas, null, 2));
}
  
});

client.login(process.env.TOKEN);
