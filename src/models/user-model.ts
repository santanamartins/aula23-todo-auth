import { config } from "../../conf/config"
import { Database } from "./database"

export class User {
    id: number = 0
    email: string = ''
    password: string = ''

    constructor(email: string, password: string) {
        this.email = email
        this.password = password
    }
}

export class UserDTO extends User {
    _id?: number = 0
}

export interface UserId {
    name: string, 
    value: number
}

export class UserDAO {
    protected database: Database

    constructor(db: Database) {
        this.database = db
    }

    protected getItemCollection() {
        return this.database.getDb().collection<UserDTO>(config.db.collections.users)
    }

    protected getSequenceCollection() {
        return this.database.getDb().collection<UserId>(config.db.collections.sequences)
    }

    private async newId(): Promise<number> {
        try {
            let lastId = await this.getSequenceCollection().findOne<UserId>({name: config.db.sequences.userId})

            if (!lastId) {
                lastId = {
                    name: config.db.sequences.userId,
                    value: 1
                }
            } else {
                lastId.value++
            }

            const result = await this.getSequenceCollection().replaceOne(
                {name: config.db.sequences.userId}, 
                lastId, 
                {upsert: true}
            )

            if (result.acknowledged) {
                return lastId.value
            }

            throw new Error('Invalid value during id generation')
        } catch(error) {
            console.log(error)
            throw error
        }        
    }

    async insert(user: User): Promise<number> {
        try {
            
            const previous = await this.getItemCollection().findOne({email: user.email})

            if (previous) {
                throw new Error("User already exists")
            }

            user.id = await this.newId()

            const response = await this.getItemCollection().insertOne(user)

            if (response.acknowledged) {
                return user.id
            }
            throw new Error('Invalid result while inserting an element')
        } catch(error) {
            console.log(error)
            throw error
        }
    }

    async findByEmail(email: string): Promise<User> {
        try {
            console.log(email)
            const item = await this.getItemCollection().findOne({email: email})

            if (item) {
                return item
            }
            throw new Error("Failed to find element with given id")
        } catch(error) {
            console.log(error)
            throw error
        }
    }
}