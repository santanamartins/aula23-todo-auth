import { config } from "../../conf/config"
import { Database } from "./database"

/**
 * Domain object.
 */
export class ToDoItem {
    id: number = 0
    description: string = ''
    tags: string[] = []
    deadline: string = ''
    user: string
    
    constructor(description: string, user: string) {
        this.description = description
        this.user = user
    }

    equals(other: ToDoItem): boolean {
        return this.id == other.id
            && this.description == other.description
            && JSON.stringify(this.tags.sort()) == JSON.stringify(other.tags.sort())
            && this.deadline == other.deadline
            && this.user == other.user
    }

}

/**
 * Data Transfer Object.
 * Contains all domain properties plus the
 * mongo-specific _id field in order to 
 * make structural typing work.
 */
export class ToDoItemDTO extends ToDoItem {
    _id?: number = 0
}

export interface ToDoId {
    name: string,
    value: number
}

/**
 * Data Acess Object.
 */
export class ToDoItemDAO {
    protected database: Database

    constructor(db: Database) {
        this.database = db
    }

    /**
     * Get the item collection, as specified in the configuration file.
     * The collection received a type parameter due to structural typing.
     * 
     * @returns the item collection
     */
    protected getItemCollection() {
        return this.database.getDb().collection<ToDoItemDTO>(config.db.collections.todoItems)
    }

    /**
     * Get the sequence collection, as specified in the configuration file.
     * 
     * @returns the sequence collection
     */
    protected getSequenceCollection() {
        return this.database.getDb().collection<ToDoId>(config.db.collections.sequences)
    }

    /**
     * Generate a new sequential id via the sequences collection.
     * The sequence name is specified in the configuration file.
     * 
     * @returns the new id number
     */
    private async newId(): Promise<number> {
        try {
            let lastId = await this.getSequenceCollection().findOne<ToDoId>({name: config.db.sequences.toDoItemId})

            if (!lastId) {
                lastId = {
                    name: config.db.sequences.toDoItemId,
                    value: 1
                }
            } else {
                lastId.value++
            }

            const result = await this.getSequenceCollection().replaceOne(
                {name: config.db.sequences.toDoItemId}, 
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

    /**
     * Insert a item.
     * 
     * @param item the item
     * @returns the id of the new item
     */
    async insert(item: ToDoItem): Promise<number> {
        try {
            item.id = await this.newId()

            const response = await this.getItemCollection().insertOne(item)

            if (response.acknowledged) {
                return item.id
            }
            throw new Error('Invalid result while inserting an element')
        } catch(error) {
            console.log(error)
            throw error
        }
    }

    /**
     * List all items.
     * 
     * @returns an array containing all items
     */
    async list(user: string): Promise<ToDoItem[]> {
        try {
            return await this.getItemCollection().find<ToDoItemDTO>({
                user: user
            }).toArray()
        } catch(error) {
            console.log(error)
            throw error 
        }
    }

    listAll = this.list

    /**
      * Find an item using its id
      * 
      * @param id the item id
      */
    async findById(id: number): Promise<ToDoItem> {
        try {
            const response = await this.getItemCollection().findOne<ToDoItemDTO>({id: id})
           
            if (response) {
                return response
            }
            throw new Error("Failed to find element with the given id")
        } catch (error) {
            console.error("Failed to find element by id")
            throw error
        }
    }

    /**
     * Update the target item that matched the base item id. All properties
     * of the target item will be updated with the property values of 
     * the base item.
     * 
     * @param item the base item
     * @returns true if the update was successfull, false otherwise
     */
    async update(item: ToDoItem): Promise<boolean> {
        try {
            const response = await this.getItemCollection().replaceOne(
                {id: item.id}, item)
            return (response) ? response.matchedCount > 0 : false
        } catch (error) {
            console.error("Failed to update element")
            throw error
        }
    }

    /**
     * Remove an item given its id.
     * 
     * @param id the item id
     * @returns true if the item was removed, false otherwise
     */
    async removeById(id: number): Promise<boolean> {
        try {
            const response = await this.getItemCollection().deleteOne(
                {id: id}, 
                {})
            return (response.deletedCount) ? response.deletedCount > 0 : false
        } catch (error) {
            console.error("Failed to remove element")
            throw error
        }
    }
}

/**
 * Criteria for ascending date order
 * Dateless elements are pushed to the bottom
 * @param {ToDoItem} a an item
 * @param {ToDoItem} b an item
 * @return {number} values expected by comparable
 */
export function ascComparator(a: ToDoItem, b: ToDoItem): number {
    const dateA = Date.parse(a?.deadline || '')
    const dateB = Date.parse(b?.deadline || '')

    /**
     * a < b -> -1
     * a > b -> 1
     * a = b -> 0
     */

    if (dateA && dateB) {
        if (dateA < dateB) {
            return -1
        } else if (dateA > dateB) {
            return 1
        }
        return 0
    } else if (!dateA && dateB) {
        return 1
    } else if (dateA && !dateB) {
        return -1
    }
    return 0
}

/**
 * Criteria for descending date order
 * Dateless elements are pushed to the bottom.
 *
 * @param {ToDoItem} a an item
 * @param {ToDoItem} b an item
 * @return {number} values expected by comparable
 */
export function descComparator(a: ToDoItem, b: ToDoItem): number {
    const dateA = Date.parse(a?.deadline || '')
    const dateB = Date.parse(b?.deadline || '')

    if (dateA && dateB) {
        if (dateA < dateB) {
            return 1
        } else if (dateA > dateB) {
            return -1
        }
        return 0
    } else if (!dateA && dateB) {
        return 1
    } else if (dateA && !dateB) {
        return -1
    }
    return 0
}

export interface TagGroups {
    [key: string]: ToDoItem[]
}
const NOTAG = 'untagged'

export function groupByTags(items: ToDoItem[]): TagGroups {
    const groups: TagGroups = {}

    for (const item of items) {
        if (item.tags && item.tags.length < 1) {
            if (NOTAG in groups) {
                groups[NOTAG].push(item)
            } else {
                groups[NOTAG] = [item]
            }
        }
        for (const tag of item.tags || []) {
            if (tag in groups) {
                groups[tag].push(item)
            } else {
                groups[tag] = [item]
            }
        }
    }

    for (const tag in groups) {
        if (tag in Object.keys(groups)) {
            groups[tag].sort(ascComparator)
        }
    }

    return groups
}