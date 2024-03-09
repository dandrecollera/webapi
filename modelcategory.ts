import mysql, { Pool } from 'mysql';
import { config } from 'dotenv';

config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

interface Model {
    id: number;
    categories: string;
}

function tableExists(tableName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        pool.query('SHOW TABLES LIKE ?', [tableName], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0);
            }
        })
    })
}

async function createTableIfNotExists(tableName: string) {
    const exists = await tableExists(tableName);
    if (!exists) {
        const query = `CREATE TABLE ${tableName} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            modelid INT,
            categoryid INT,
            FOREIGN KEY (modelid) REFERENCES models(id),
            FOREIGN KEY (categoryid) REFERENCES categories(id)
        ) ENGINE=InnoDB`;

        pool.query(query, (error, results) => {
            if (error) {
                console.error('Error Creating Table: ', error);
            } else {
                console.log('Table Created Successfully');
            }
        })
    } else {
        console.log('Table Already Exist');
    }
}

async function insertModelCategories() {
    try {
        const query = 'SELECT id, categories FROM models';
        pool.query(query, (error, results: Model[]) => {
            if (error) {
                console.error(error);
            } else {
                results.forEach(element => {
                    const modelId = element.id;
                    const categories = JSON.parse(element.categories);
                    console.log(modelId, categories);
                    insertProcess(modelId, categories);
                });
            }
        });
    } catch (error) {
        console.error(error);
    }
}

async function insertProcess(modelId: number, categories: any) {
    try {
        categories.forEach(async (category: any) => {
            const getID = 'SELECT id FROM categories WHERE name = ?';
            pool.query(getID, [category], (error, results) => {
                if (error) {
                    console.error('Error Retrieving Category ID: ', error);
                } else {
                    if (results.length > 0) {
                        const categoryId = results[0].id;
                        const checkExistenceQuery = 'SELECT COUNT(*) AS count FROM modelcategories WHERE modelId = ? AND categoryId = ?';
                        pool.query(checkExistenceQuery, [modelId, categoryId], (error, results) => {
                            if (error) {
                                console.error('Error Checking Existence: ', error);
                            } else {
                                const count = results[0].count;
                                if (count === 0) {
                                    const insertModelCategory = 'INSERT INTO modelcategories (modelId, categoryId) VALUES (?, ?)';
                                    pool.query(insertModelCategory, [modelId, categoryId], (error, results) => {
                                        if (error) {
                                            console.error('Error Inserting Model Category: ', error);
                                        } else {
                                            console.log('Model Category Inserted Successfully');
                                        }
                                    });
                                } else {
                                    console.log('Model Category Already Exists');
                                }
                            }
                        });
                    } else {
                        console.error('Category not found:', category);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error Inserting Model Categories: ', error);
    }
}

insertModelCategories();