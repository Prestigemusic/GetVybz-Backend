import {Router} from 'express'; const r=Router(); r.post('/', (req,res)=>res.json({id:'bk_demo', checkoutUrl:'https://example.com/checkout?success=true'})); export default r;
