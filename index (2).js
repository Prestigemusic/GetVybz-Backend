import express from 'express';
const app=express();app.use(express.json());app.get('/',(r,s)=>s.send('GetVybz API running'));app.listen(4000,()=>console.log('listening'));
