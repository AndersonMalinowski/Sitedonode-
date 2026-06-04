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
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco REAL NOT NULL,
        imagem TEXT,
        estoque INTEGER DEFAULT 50
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE,
        telefone TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        data TEXT DEFAULT CURRENT_TIMESTAMP,
        total REAL,
        status TEXT DEFAULT 'Pendente',
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )`);

    // ==================== 50 PRODUTOS ====================
    const produtosIniciais = [
        ["Whey Protein Isolado 2kg", "Proteína de alto valor biológico, baixo carboidrato", 199.90, "whey.jpg"],
        ["Creatina Monohidratada 500g", "Aumenta força, potência e massa muscular", 99.90, "creatina.jpg"],
        ["Pré-Treino Explosivo 300g", "Energia extrema, foco e pump muscular", 139.90, "pretreino.jpg"],
        ["BCAA 4:1:1 200g", "Recuperação muscular acelerada", 79.90, "bcaa.jpg"],
        ["Mass Gainer 3kg", "Ganho de massa limpa com alto teor calórico", 169.90, "mass.jpg"],
        ["Multivitamínico Atleta 120 cápsulas", "Suporte completo de vitaminas e minerais", 64.90, "multivit.jpg"],
        ["Ômega 3 1000mg 120 cápsulas", "Saúde cardiovascular e anti-inflamatório", 59.90, "omega3.jpg"],
        ["Colágeno Hidrolisado 300g", "Saúde das articulações e pele", 89.90, "colageno.jpg"],
        ["Glutamina 300g", "Melhora recuperação e sistema imunológico", 74.90, "glutamina.jpg"],
        ["Termogênico 60 cápsulas", "Queima de gordura acelerada", 89.90, "termogenico.jpg"],
        ["Whey Protein Concentrado 2kg", "Custo-benefício premium", 149.90, "whey-conc.jpg"],
        ["Creatina Creapure 300g", "Qualidade farmacêutica importada", 119.90, "creapure.jpg"],
        ["Pré-Treino Sem Estimulante 250g", "Pump sem cafeína", 109.90, "pre-no-stim.jpg"],
        ["EAA 300g", "Aminoácidos essenciais completos", 94.90, "eaa.jpg"],
        ["Whey Protein Hidrolisado 1.8kg", "Absorção ultra rápida", 229.90, "whey-hidro.jpg"],
        ["ZMA 90 cápsulas", "Recuperação noturna e testosterona", 69.90, "zma.jpg"],
        ["Beta Alanina 200g", "Aumento de resistência muscular", 64.90, "beta-alanina.jpg"],
        ["Caféina 200mg 120 cápsulas", "Energia e foco mental", 44.90, "cafeina.jpg"],
        ["Vitamina D3 5000UI 120 cápsulas", "Imunidade e saúde óssea", 54.90, "vitd.jpg"],
        ["Magnésio Dimalato 90 cápsulas", "Redução de cãibras e fadiga", 59.90, "magnesio.jpg"],
        ["Barra de Proteína Choco 12 un", "Snack proteico delicioso", 89.90, "barra-choco.jpg"],
        ["Maltodextrina 1kg", "Carboidrato de alto índice glicêmico", 39.90, "maltodextrina.jpg"],
        ["Dextrose 1kg", "Recarga glicogênica pós-treino", 34.90, "dextrose.jpg"],
        ["Shaker 700ml Preto", "Garrafa agitadora premium", 29.90, "shaker.jpg"],
        ["Luvas de Treino Profissionais", "Alta durabilidade e conforto", 69.90, "luvas.jpg"],
        ["Cinto de Levantamento de Peso", "Suporte lombar reforçado", 119.90, "cinto.jpg"],
        ["Whey 3W 2kg", "Blend de 3 proteínas", 179.90, "whey-3w.jpg"],
        ["Caseína 1.8kg", "Proteína de liberação lenta", 159.90, "caseina.jpg"],
        ["HMB 120 cápsulas", "Anti-catabólico muscular", 99.90, "hmb.jpg"],
        ["Tribulus Terrestris 500mg", "Suporte natural à testosterona", 74.90, "tribulus.jpg"],
        ["L-Carnitina 120 cápsulas", "Transporte de gordura para energia", 79.90, "carnitina.jpg"],
        ["CLA 120 cápsulas", "Redução de gordura corporal", 69.90, "cla.jpg"],
        ["Vitamina C 1000mg 120 cápsulas", "Antioxidante e imunidade", 49.90, "vitc.jpg"],
        ["Melatonina 3mg 60 cápsulas", "Melhora qualidade do sono", 39.90, "melatonina.jpg"],
        ["Ashwagandha KSM-66", "Redutor de estresse e cortisol", 84.90, "ashwagandha.jpg"],
        ["Taurina 200g", "Melhora performance e foco", 54.90, "taurina.jpg"],
        ["Citrulina Malato 200g", "Melhor pump e resistência", 89.90, "citrulina.jpg"],
        ["Arginina 300g", "Aumento de óxido nítrico", 69.90, "arginina.jpg"],
        ["BCAA em Cápsulas 120 un", "Praticidade e recuperação", 59.90, "bcaa-caps.jpg"],
        ["Whey Protein Vegan 1.8kg", "Proteína vegetal premium", 169.90, "whey-vegan.jpg"],
        ["Creatina Micronizada 250g", "Melhor absorção", 79.90, "creatina-mic.jpg"],
        ["Pré-Treino Hardcore 400g", "Fórmula extrema para treinos pesados", 159.90, "pre-hardcore.jpg"],
        ["Colágeno Tipo 2 60 cápsulas", "Saúde das articulações", 94.90, "colageno-t2.jpg"],
        ["Óleo de Peixe 120 cápsulas", "Alta concentração de EPA/DHA", 79.90, "oleo-peixe.jpg"],
        ["Maca Peruana 500mg", "Energia e libido", 64.90, "maca.jpg"],
        ["CoQ10 200mg", "Saúde cardiovascular", 89.90, "coq10.jpg"],
        ["Potássio 99mg 120 cápsulas", "Equilíbrio eletrolítico", 44.90, "potassio.jpg"],
        ["Sódio + Potássio (Eletrolitos)", "Hidratação durante treinos", 49.90, "eletrolitos.jpg"],
        ["Pacote 10 Barras Proteicas Variadas", "Saborosas e práticas", 119.90, "barras-mix.jpg"]
    ];

    // Insere os 50 produtos (evita duplicatas)
    produtosIniciais.forEach(p => {
        db.run(`INSERT OR IGNORE INTO produtos (nome, descricao, preco, imagem) VALUES (?, ?, ?, ?)`, p);
    });

    console.log("✅ 50 produtos carregados com sucesso!");
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
    const { cliente_id, total } = req.body;
    db.run(`INSERT INTO pedidos (cliente_id, total) VALUES (?, ?)`,
        [cliente_id, total], function(err) {
            res.json({ pedido_id: this.lastID, success: true });
        });
});

app.listen(port, () => {
    console.log(`🚀 SupleFit Store rodando em http://localhost:${port}`);
});
