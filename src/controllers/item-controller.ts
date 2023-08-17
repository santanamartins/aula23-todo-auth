import { RequestHandler } from "express"
import { ToDoItem, ToDoItemDAO, ascComparator, descComparator, groupByTags } from "../models/item-model"
import { Database } from "../models/database"

export class ItemController {
    private dao: ToDoItemDAO

    constructor(database: Database) {
        this.dao = new ToDoItemDAO(database)
    }

    newest:RequestHandler = async (req, res, next) => {
        try {
            const items = await this.dao.listAll('')
    
            items.sort(ascComparator)
            res.render('newest', {
                items: items
            })
        } catch(error) {
            next(error)
        }
    }
    
    oldest: RequestHandler = async (req, res, next) => {
        try {
            const items = await this.dao.listAll('')
    
            items.sort(descComparator)
    
            res.render('oldest', {
                items: items
            })
        } catch(error) {
            next(error)
        }
    }
    
    tags: RequestHandler = async (req, res, next) => {
        try {
            const groupedItems = groupByTags(await this.dao.listAll(''))
    
            res.render('tags', {
                tags: Object.keys(groupedItems).sort(),
                items: groupedItems
            })
        } catch(error) {
            next(error)
        }
    }
    
    addForm: RequestHandler = (req, res) => {
        res.render('add')
    }
    
    addProcess: RequestHandler = async (req, res, next) => {
        try {
            const item = ToDoItemMapper.fromJson(req.body)

            
            await this.dao.insert(item)
            res.render('status', {
                code: 'item_add_success'
            })
        } catch(error) {
            next(error)
        }
    }
    
    editForm: RequestHandler = async (req, res, next) => {
        try {
            const item = await this.dao.findById(parseInt(req.params.id))    
    
            res.render('add', {
                item: item,
                edit: true
            })    
        } catch(error) {
            next(error)
        }
    }
    
    editProcess: RequestHandler = async (req, res, next) => {
        try {
            const item = ToDoItemMapper.fromJson(req.body)

            
            await this.dao.update(item)
            res.render('status', {
                code: 'item_update_success'
            })
        } catch(error) {
            next(error)
        }
    }
    
    remove: RequestHandler = async (req, res, next) => {
        try {
            await this.dao.removeById(parseInt(req.params.id))
            res.render('status', {
                code: 'item_remove_success'
            })    
        } catch(error) {
            next(error)
        }
        
    }
}

class ToDoItemMapper {
    static fromJson(json: any): ToDoItem {
        if ('description' in json) {
            const item = {
                id: 0,
                description: json.description
            } as ToDoItem
            if ('id' in json) {
                item.id = parseInt(json.id)
            }
            if ('tags' in json) {
                item.tags = (json.tags as string).split(',').map( el => el.trim())
            }
            if ('deadline' in json) {
                item.deadline = json.deadline
            }

            return item
        }
        throw new Error('Invalid item format')
    }
}

