import { response } from 'express';
import React from 'react';
import { render } from 'react-dom';
import App from './App';

fetch('config.json').then(resp => resp.json()).then(data => {
    let idx = Math.floor(Math.random() * data.urls.length);
    render(<App videoUrl={data.urls[idx]} skew={data.skew} />, document.getElementById("root"));
});
