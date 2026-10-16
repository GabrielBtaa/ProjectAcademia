import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Loader2, CheckCircle2, Unplug } from 'lucide-react';
import { apiFetch } from '../lib/api';

/**
 * Cada academia conecta o PRÓPRIO WhatsApp lendo um QR code (como no WhatsApp Web).
 * As mensagens aos alunos saem desse número, e se um número cair só afeta aquela academia.
 */
export default function ConexaoWhatsapp({ onEstado }) {
  const [info, setInfo] = useState(null); // { disponivel, estado }
  const [modalAberto, setModalAberto] = useState(false);
  const [qr, setQr] = useState(null);
  const [erro, setErro] = useState(null);
  const [desconectando, setDesconectando] = useState(false);
  const timers = useRef({ status: null, qr: null });
  const qrRef = useRef(null); // valor atual do QR, legível de dentro dos intervalos

  const carregarStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/whatsapp/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao consultar o WhatsApp');
      setInfo(data);
      return data;
    } catch (e) {
      setErro(e.message);
      return null;
    }
  }, []);

  useEffect(() => { carregarStatus(); }, [carregarStatus]);
  useEffect(() => { onEstado?.(info?.estado === 'open'); }, [info, onEstado]);

  const pararTimers = () => {
    clearInterval(timers.current.status);
    clearInterval(timers.current.qr);
    timers.current = { status: null, qr: null };
  };
  useEffect(() => pararTimers, []);

  const buscarQr = useCallback(async () => {
    try {
      const res = await apiFetch('/api/whatsapp/conectar', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar o QR code');
      setErro(null);
      if (data.estado === 'open') {
        pararTimers();
        setModalAberto(false);
        setInfo({ disponivel: true, estado: 'open' });
        return;
      }
      qrRef.current = data.qrcode || null;
      setQr(data.qrcode || null);
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  const abrirConexao = async () => {
    setErro(null);
    setQr(null);
    qrRef.current = null;
    setModalAberto(true);
    await buscarQr();
    // O QR do WhatsApp expira em ~30s: renova sozinho, e confere se já foi escaneado
    timers.current.qr = setInterval(buscarQr, 25000);
    timers.current.status = setInterval(async () => {
      const s = await carregarStatus();
      if (s?.estado === 'open') {
        pararTimers();
        setModalAberto(false);
      } else if (!qrRef.current) {
        buscarQr(); // ainda sem QR (instância acabou de ser criada): tenta de novo
      }
    }, 3000);
  };

  const fecharModal = () => {
    pararTimers();
    setModalAberto(false);
    carregarStatus();
  };

  const desconectar = async () => {
    if (!window.confirm('Desconectar o WhatsApp? O envio automático de mensagens será desligado.')) return;
    setDesconectando(true);
    setErro(null);
    try {
      const res = await apiFetch('/api/whatsapp/desconectar', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao desconectar');
      await carregarStatus();
      window.dispatchEvent(new CustomEvent('gymflow:settings-updated'));
    } catch (e) {
      setErro(e.message);
    } finally {
      setDesconectando(false);
    }
  };

  const conectado = info?.estado === 'open';

  return (
    <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--surface-alt-1)', border: '1px solid var(--border-2)' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle size={16} style={{ color: conectado ? '#22c55e' : 'var(--text-muted)' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
              WhatsApp da academia {conectado ? '— conectado' : '— não conectado'}
            </p>
            <p className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
              {info === null && 'Verificando...'}
              {info && !info.disponivel && 'O envio por WhatsApp está indisponível no momento.'}
              {info?.disponivel && !conectado && 'Conecte o número que sua academia usa com os alunos: as mensagens saem dele.'}
              {conectado && 'As cobranças e lembretes são enviados pelo número da sua academia.'}
            </p>
          </div>
        </div>
        {info?.disponivel && (conectado ? (
          <button onClick={desconectar} disabled={desconectando}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Unplug size={13} /> {desconectando ? 'Desconectando...' : 'Desconectar'}
          </button>
        ) : (
          <button onClick={abrirConexao}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
            <MessageCircle size={13} /> Conectar WhatsApp
          </button>
        ))}
      </div>
      {erro && !modalAberto && <p className="text-xs" style={{ color: '#f87171' }}>{erro}</p>}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'var(--surface-modal)', border: '1px solid var(--border-2)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-2)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Conectar WhatsApp</h3>
              <button onClick={fecharModal} aria-label="Fechar" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 text-center">
              <div className="mx-auto rounded-xl flex items-center justify-center bg-white" style={{ width: 240, height: 240 }}>
                {qr
                  ? <img src={qr} alt="QR code para conectar o WhatsApp" width={224} height={224} />
                  : <span className="flex flex-col items-center gap-2 text-xs text-gray-500"><Loader2 className="animate-spin" size={22} />Gerando QR code...</span>}
              </div>
              <ol className="text-xs text-left space-y-1 list-decimal pl-5" style={{ color: 'var(--text-secondary)' }}>
                <li>Abra o WhatsApp no celular da academia</li>
                <li>Toque em <strong>Configurações → Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong> e aponte para o QR code</li>
              </ol>
              {erro && <p className="text-xs" style={{ color: '#f87171' }}>{erro}</p>}
              <p className="text-[0.68rem]" style={{ color: 'var(--text-muted)' }}>
                <CheckCircle2 size={11} className="inline mr-1" />
                Esta janela fecha sozinha quando a conexão for concluída.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
