import express from 'express'
import { createUser, getStockBalance, getUser, getUserBalance, onRampMoney } from '../controllers/userController'

const router = express.Router()

router.post('/create', createUser)
router.post('/onramp', onRampMoney)
router.get('/walletbalance', getUserBalance)
router.get('/stockbalance', getStockBalance)
router.get('/getuser/:userId', getUser)

export default router;