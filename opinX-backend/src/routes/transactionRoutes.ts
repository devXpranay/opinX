import express from 'express'
import { stockTransaction } from '../controllers/transactionController'

const router = express.Router()

router.post('/:stockType', stockTransaction)

export default router;