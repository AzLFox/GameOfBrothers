const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// статика
app.use(express.static(path.join(__dirname, '../public')));
app.use('/vendor/gsap', express.static(path.join(__dirname, '../node_modules/gsap/dist')));
app.use('/vendor/pixi', express.static(path.join(__dirname, '../node_modules/pixi.js/dist')));
app.use('/vendor/page-flip', express.static(path.join(__dirname, '../node_modules/page-flip/dist/js')));

// api
app.get('/api/characters', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/data/characters.json'));
});

// страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/character', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/character.html'));
});

app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/create.html'));
});

app.listen(PORT, () => {
  console.log('Server running: http://localhost:', PORT);
});