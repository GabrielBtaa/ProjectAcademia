import "./lib/load-env.js";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";

const app = express();

const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : true;

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

function toDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

function avatarFromNome(nome) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first[0] + last).toUpperCase();
}

function serializePlano(p) {
  return {
    id: p.id,
    nome: p.nome,
    duracao: p.duracao,
    valor: Number(p.valor),
    descricao: p.descricao,
  };
}

function serializeAluno(a) {
  return {
    id: a.id,
    nome: a.nome,
    cpf: a.cpf,
    whatsapp: a.whatsapp,
    dataNascimento: toDateOnly(a.dataNascimento),
    dataVencimento: toDateOnly(a.dataVencimento),
    dataCadastro: toDateOnly(a.dataCadastro),
    status: a.status,
    planoId: a.planoId,
    plano: a.plano?.nome,
    avatar: a.avatar || avatarFromNome(a.nome),
  };
}

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, message: "Backend rodando", db: true });
  } catch {
    res.status(503).json({ ok: false, message: "Backend rodando", db: false });
  }
});

app.get("/api/planos", async (req, res) => {
  try {
    const planos = await prisma.plano.findMany({ orderBy: { id: "asc" } });
    res.json(planos.map(serializePlano));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar planos" });
  }
});

app.get("/api/alunos", async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany({
      include: { plano: true },
      orderBy: { id: "asc" },
    });
    res.json(alunos.map(serializeAluno));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar alunos" });
  }
});

app.post("/api/alunos", async (req, res) => {
  const { nome, cpf, whatsapp, dataNascimento, planoId, dataVencimento, status } = req.body || {};
  if (!nome || !cpf || !whatsapp || !dataNascimento || !planoId || !dataVencimento) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }
  try {
    const created = await prisma.aluno.create({
      data: {
        nome: String(nome),
        cpf: String(cpf),
        whatsapp: String(whatsapp),
        dataNascimento: new Date(String(dataNascimento) + "T12:00:00"),
        dataVencimento: new Date(String(dataVencimento) + "T12:00:00"),
        planoId: Number(planoId),
        status: status || "ativo",
        avatar: avatarFromNome(String(nome)),
      },
      include: { plano: true },
    });
    res.status(201).json(serializeAluno(created));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(400).json({ error: "CPF já cadastrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Erro ao criar aluno" });
  }
});

app.put("/api/alunos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
  const { nome, cpf, whatsapp, dataNascimento, planoId, dataVencimento, status } = req.body || {};
  if (!nome || !cpf || !whatsapp || !dataNascimento || !planoId || !dataVencimento) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }
  try {
    const updated = await prisma.aluno.update({
      where: { id },
      data: {
        nome: String(nome),
        cpf: String(cpf),
        whatsapp: String(whatsapp),
        dataNascimento: new Date(String(dataNascimento) + "T12:00:00"),
        dataVencimento: new Date(String(dataVencimento) + "T12:00:00"),
        planoId: Number(planoId),
        status: status || "ativo",
        avatar: avatarFromNome(String(nome)),
      },
      include: { plano: true },
    });
    res.json(serializeAluno(updated));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(400).json({ error: "CPF já cadastrado" });
    }
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Aluno não encontrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar aluno" });
  }
});

app.delete("/api/alunos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
  try {
    await prisma.aluno.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Aluno não encontrado" });
    }
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir aluno" });
  }
});

// Export para Vercel
export default app;