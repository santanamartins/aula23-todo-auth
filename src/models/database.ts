import { MongoClient } from "mongodb";
import { config } from "../../conf/config";

export class Database {
    protected client: MongoClient

    constructor() {
        this.client = new MongoClient(config.db.url)
    }

    async connect() {
        try {
            await this.client.connect()
            console.log("Database connected")
        } catch(error) {
            console.log(error)
            throw error
        }
    }

    async disconnect() {
        try {
            await this.client.close()
            console.log("Database disconnected")
        } catch(error) {
            console.log(error)
            throw error
        }
    }

    getDb() {
        try {
            return this.client.db(config.db.name)
        } catch(error) {
            console.log(error)
            throw error
        }
        
    }
}