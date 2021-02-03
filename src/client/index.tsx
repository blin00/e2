import { response } from 'express';
import React from 'react';
import { render } from 'react-dom';
import App from './App';

fetch('config.json').then(resp => resp.json()).then(data => {
    render(<App videoUrl={data.url} skew={data.skew} />, document.getElementById("root"));
});
