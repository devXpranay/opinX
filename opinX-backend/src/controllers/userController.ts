import { Request, Response } from "express";
import { User, Wallet } from "../globalVariables.variable";
import { createId, findFunc } from "../utils/helperFunc.util";
import { getGlobalVariable, setGlobalVariable } from "../utils/talkToRedis";


export const createUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email } = req.body;
        if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });
        const userId = createId('user_')
        const wallet: Wallet = { walletId: `wallet_${userId}`, balance: 0, locked: 0 };
        const user: User = {
            userId,
            name,
            email,
            wallet,
            stocks: new Map()
        };
        
        let users: Map<User['userId'], User> = await getGlobalVariable('users')
        if (users === null || Object.keys(users).length === 0) {
            users = new Map<User['userId'], User>();
          } else {
            users = new Map<User['userId'], User>(Object.entries(users));
          }
        users.set(userId, user)
        await setGlobalVariable('users', Object.fromEntries(users));
            
        return res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};

export const onRampMoney = async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId, amount } = req.body;
        if (!userId || amount == null) return res.status(400).json({ message: 'User ID and amount are required.' });
        const user: User = await findFunc('user', userId) as User;
        console.log(user)
        if (!user) return res.status(404).json({ message: "User not found" });
        user.wallet.balance += amount;

        let users: Map<User['userId'], User> = await getGlobalVariable('users');
        if (users === null || Object.keys(users).length === 0) {
            users = new Map<User['userId'], User>();
          } else {
            users = new Map<User['userId'], User>(Object.entries(users));
          }
        console.log(users)
        users.set(userId, user)
        await setGlobalVariable('users', Object.fromEntries(users));

        return res.status(200).json({ balance: user.wallet.balance });
    } catch (error: any) {
        console.error('Error onramping money:', error);
        return res.status(500).json({ message: 'Error onramping money', error: error.message || error });    
    }
};

export const getUserBalance = async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'User ID is required.' });
        const user: User = await findFunc('user' ,userId) as User;
        if (!user) return res.status(404).json({ message: "User not found" });

        return res.status(200).json({ balance: user.wallet.balance });
    } catch (error) {
        return res.status(500).json({ message: 'Error getting user balance', error });
    }
};

export const getStockBalance = async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'User ID is required.' });
        const user: User = await findFunc('user', userId) as User;
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ stocks: user.stocks });
    } catch (error) {
        return res.status(500).json({ message: 'Error getting stock balance', error });
    }
};

export const getUser = async (req: Request, res: Response): Promise<any> => {
    try{
        const { userId } = req.params;
        if(!userId) return res.status(400).json({message: "User ID is required"})
        const user: User = await findFunc('user', userId) as User;
        if(!user) return res.status(404).json({message: "User not found"})
        return res.status(200).json(user)
    }
    catch(e) {
        res.status(400).json({message: "Error while getting user", e})
    }
}
