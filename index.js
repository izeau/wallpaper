#!/usr/bin/env node

'use strict';

const jxa = require('run-jxa');
const { get } = require('https');
const { createWriteStream } = require('fs');
const { resolve } = require('path');

const REDDITS = 'cityporn+earthporn+exposureporn+skyporn+spaceporn';
const SOURCE  = `https://www.reddit.com/r/${REDDITS}/new.json`;
const RATIO   = 16 / 10;
const MARGIN  = 0.3;
const WIDTH   = 2560;
const HEIGHT  = 1600;
const PICTURE = resolve(__dirname, 'pictures', String(Date.now()));

process.on('uncaughtException', console.error);

get(SOURCE, res => {
  let json = '';

  res.on('data', data => json += data);
  res.on('end', () => handlePosts(idx('data.children', JSON.parse(json))));
});

function handlePosts(posts = []) {
  const post = posts.find(post => {
    const preview = idx('data.preview.images.0.source', post);

    if (!preview) {
      return;
    }

    if (preview.width < WIDTH || preview.height < HEIGHT) {
      return;
    }

    if (Math.abs(RATIO - preview.width / preview.height) > MARGIN) {
      return;
    }

    return true;
  });

  const url = idx('data.preview.images.0.source.url', post)
    .replace('&amp;', '&');

  get(url, res => {
    res
      .pipe(createWriteStream(PICTURE))
      .on('close', setBackground);
  });
}

function setBackground() {
  console.log(PICTURE);
  jxa(`
    const SystemEvents = Application('System Events');

    SystemEvents.desktops.displayName.get().forEach(function(desktop) {
      SystemEvents.desktops[desktop].picture.set(args[0]);
    });
  `, [PICTURE])
    .catch(err => console.error(err));
}

function idx(props, obj) {
  if (typeof props === 'string') {
    return idx(props.split('.'), obj);
  }

  return props.reduce((xs, x) => xs && xs[x] || null, obj);
}
