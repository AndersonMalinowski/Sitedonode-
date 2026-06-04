const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// BANCO DE DADOS EM MEMÓRIA
const clientes = [
    { nome: "Lucas Silva", email: "lucas@email.com" } // Exemplo inicial
];

const agendamentos = [
    { clienteEmail: "lucas@email.com", produto: "Whey Protein 1kg", quantidade: 2, total: "299.80", dataRetirada: "2026-06-15" } // Exemplo inicial
];

const produtos = [
    { id: 1, nome: "Whey Protein 1kg", preco: 149.90, tipo: "Suplemento" },
    { id: 2, nome: "Creatina 300g", preco: 89.90, tipo: "Suplemento" },
    { id: 3, nome: "Halter Emborrachado 10kg", preco: 120.00, tipo: "Equipamento" },
    { id: 4, nome: "Banco Supino Regulável", preco: 599.00, tipo: "Equipamento" }
];

const servicos = [
    { nome: "Musculação Livre", preco: "R$ 99,90/mês" },
    { nome: "Consultoria Online com Personal", preco: "R$ 150,00/mês" },
    { nome: "Avaliação Física Bioimpedância", preco: "R$ 50,00/sessão" }
];

// ROTA PRINCIPAL (Home com Produtos, Serviços, Clientes e Agendamentos)
app.get('/', (req, res) => {
    res.render('index', { produtos, servicos, clientes, agendamentos });
});

// ROTA DE CADASTRO (Exibir Página)
app.get('/cadastro', (req, res) => {
    res.render('cadastro', { mensagem: null });
});

// ROTA DE CADASTRO (Salvar Cliente)
app.post('/cadastro', (req, res) => {
    const { nome, email, senha } = req.body;
    
    // Verifica se o e-mail já existe
    const existe = clientes.find(c => c.email === email);
    if (existe) {
        return res.render('cadastro', { mensagem: "Erro: Este e-mail já está cadastrado!" });
    }

    clientes.push({ nome, email, senha });
    res.render('cadastro', { mensagem: "Cliente cadastrado com sucesso!" });
});

// ROTA DE AGENDAMENTO (Exibir Página)
app.get('/agendamento', (req, res) => {
    res.render('agendamento', { produtos, clientes, mensagem: null });
});

// ROTA DE AGENDAMENTO (Salvar Agendamento de Compra)
app.post('/agendamento', (req, res) => {
    const { clienteEmail, produtoId, quantidade, dataRetirada } = req.body;
    
    // Valida se o cliente existe no sistema
    const clienteExiste = clientes.find(c => c.email === clienteEmail);
    if (!clienteExiste) {
        return res.render('agendamento', { produtos, clientes, mensagem: "Erro: Cliente não encontrado. Cadastre-se primeiro!" });
    }

    const produto = produtos.find(p => p.id == produtoId);
    const qtd = parseInt(quantidade);
    const valorTotal = (produto.preco * qtd).toFixed(2);
    
    agendamentos.push({
        clienteEmail,
        produto: produto.nome,
        quantidade: qtd,
        total: valorTotal,
        dataRetirada
    });

    res.render('agendamento', { produtos, clientes, mensagem: "Agendamento de compra realizado com sucesso!" });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
