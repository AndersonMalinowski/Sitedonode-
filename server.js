const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('.'));

const db = new sqlite3.Database('./suplefit.db');

db.serialize(() => {
    // Tabela de Produtos
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco REAL NOT NULL,
        imagem TEXT,
        estoque INTEGER DEFAULT 50
    )`);

    // Tabela de Clientes
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE,
        telefone TEXT
    )`);

    // Tabela de Pedidos
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        data TEXT DEFAULT CURRENT_TIMESTAMP,
        total REAL,
        status TEXT DEFAULT 'Pendente',
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )`);

    // Inserir produtos iniciais
    const produtosIniciais = [
        ["Whey Protein 2kg", "Proteína isolada premium", 189.90, "whey.jpg"],
        ["Creatina Monohidratada 300g", "Aumenta força e massa muscular", 89.90, "creatina.jpg"],
        ["Pré-treino Explosivo", "Energia e foco para treinos intensos", 129.90, "pretreino.jpg"],
        ["BCAA 4:1:1", "Recuperação muscular", 69.90, "bcaa.jpg"],
        ["Multivitamínico Atleta", "Suporte imunológico e energético", 59.90, "multivit.jpg"]
    ];

    produtosIniciais.forEach(p => {
        db.run(`INSERT OR IGNORE INTO produtos (nome, descricao, preco, imagem) VALUES (?, ?, ?, ?)`, p);
    });
});

app.get('/produtos', (req, res) => {
    db.all("SELECT * FROM produtos", [], (err, rows) => {
        res.json(rows);
    });
});

app.post('/salvar-cliente', (req, res) => {
    const { nome, email, telefone } = req.body;
    db.run(`INSERT INTO clientes (nome, email, telefone) VALUES (?, ?, ?)`,
        [nome, email, telefone], function(err) {
            res.json({ id: this.lastID, success: true });
        });
});

app.post('/finalizar-pedido', (req, res) => {
    const { cliente_id, total, itens } = req.body;
    db.run(`INSERT INTO pedidos (cliente_id, total) VALUES (?, ?)`,
        [cliente_id, total], function(err) {
            res.json({ pedido_id: this.lastID, success: true });
        });
});

app.listen(port, () => {
    console.log(`🚀 SupleFit Store rodando em http://localhost:${port}`);
});
