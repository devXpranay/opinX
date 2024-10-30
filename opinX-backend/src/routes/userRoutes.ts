import express from 'express'
import { createUser, getUser, onRampMoney } from '../controllers/userController'

const router = express.Router()

router.post('/create', createUser)
router.post('/onramp', onRampMoney)
router.get('/getuser/:userId', getUser)

export default router;