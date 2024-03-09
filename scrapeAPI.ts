import mysql, { createPool } from 'mysql';
import axios from 'axios';
import { json } from 'stream/consumers';
import { table } from 'console';
import { config } from 'dotenv';

config();

const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

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
        let query = ''

        if (tableName == 'models') {
            query = `CREATE TABLE ${tableName} (
                id INT PRIMARY KEY,
                name VARCHAR(255),
                username VARCHAR(255),
                posts TEXT,
                videos TEXT,
                likes TEXT,
                categories TEXT,
                url TEXT,
                image TEXT,
                instagram TEXT,
                tiktok TEXT,
                twitter TEXT,
                pornhub TEXT,
                description TEXT,
                price TEXT,
                twitch TEXT,
                reddit TEXT,
                youtube TEXT,
                location TEXT
            ) ENGINE=InnoDB`;
        }

        if (tableName == 'categories') {
            query = `CREATE TABLE ${tableName} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255)
            ) ENGINE=InnoDB`;
        }

        pool.query(query, (error, results) => {
            if (error) {
                console.error('Error Creating Table: ', error);
            } else {
                console.log('Table Created Successfully');
            }
        });
    } else {
        console.log('Table Already Exists');
    }
}

async function modelListSaveDB(data: any[]): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const record of data) {
        const existQuery = 'SELECT username FROM models WHERE username = ?';
        promises.push(new Promise<void>((resolve, reject) => {
            pool.query(existQuery, [record.username], (error, results) => {
                if (error) {
                    console.error('error checking: ', error);
                    reject(error);
                } else {
                    if (results.length > 0) {
                        console.log(`Record with username ${record.username} already exists, skipping...`);
                        resolve();
                    } else {
                        const insertQuery = 'INSERT INTO models (id, name, username, posts, videos, likes, categories, price, twitch, reddit, youtube, location, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                        const values = [
                            record.id,
                            record.name,
                            record.username,
                            record.posts,
                            record.videos,
                            record.likes,
                            JSON.stringify(record.categories),
                            record.price,
                            record.twitch,
                            record.reddit,
                            record.youtube,
                            record.location,
                            record.url
                        ];
                        pool.query(insertQuery, values, (insertError, insertResults) => {
                            if (insertError) {
                                console.error('error inserting data:', insertError);
                                reject(insertError);
                            } else {
                                console.log(`inserted new record with username ${record.username}`);
                                resolve();
                            }
                        });
                    }
                }
            });
        }));
    }
    await Promise.all(promises);
}


async function categoryListSaveDB(data: string[]): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const name of data) {
        const existQuery = 'SELECT name FROM categories WHERE name = ?';
        promises.push(new Promise<void>((resolve, reject) => {
            pool.query(existQuery, [name], (error, results) => {
                if (error) {
                    console.error('Error checking:', error);
                    reject(error);
                } else {
                    if (results.length > 0) {
                        console.log(`Category ${name} already exists, skipping...`);
                        resolve();
                    } else {
                        const insertQuery = 'INSERT INTO categories (name) VALUES (?)';
                        const values = [name];
                        pool.query(insertQuery, values, (insertError, insertResults) => {
                            if (insertError) {
                                console.error('Error inserting data:', insertError);
                                reject(insertError);
                            } else {
                                console.log(`Inserted new category ${name}`);
                                resolve();
                            }
                        });
                    }
                }
            });
        }));
    }
    await Promise.all(promises);
}


// Rapid API
const modelListAPI = {
    method: 'POST',
    url: 'https://fans-atlas.p.rapidapi.com/api/v1/models/list',
    params: {
        limit: '30000',
        offset: '0',
    },
    headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
    },
    data: {}
};

const categoryListAPI = {
    method: 'GET',
    url: 'https://fans-atlas.p.rapidapi.com/api/v1/categories/list',
    headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
    }
}

const modelInfoAPI = {
    method: 'GET',
    url: 'https://fans-atlas.p.rapidapi.com/api/v1/models/one',
    params: {},
    headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
    }
};

const modelCountAPI = {
    method: 'POST',
    url: 'https://fans-atlas.p.rapidapi.com/api/v1/models/count',
    headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
    },
    data: {
        categories: ['free']
    }
};

async function fetchData() {
    try {
        await createTableIfNotExists('models');
        await createTableIfNotExists('categories');
        const modelList = await axios.request(modelListAPI);
        const modelListJsonData = modelList.data;
        await modelListSaveDB(modelListJsonData);

        const categoryList = await axios.request(categoryListAPI);
        const categoryListJsonData = categoryList.data;
        await categoryListSaveDB(categoryListJsonData);

    } catch (error) {
        console.error(error);
    }
}


(async () => {
    await fetchData();
    pool.end();
})();

