import {
  Settings as SettingsIcon,
  Bell,
  Globe,
  Shield,
  Palette,
  ChevronRight,
  Save,
} from 'lucide-react';
import { useState } from 'react';

// Item de configuração genérico
function SettingItem({ icon: Icon, title, description, children }) {
  return (
    <div
      className="flex items-start justify-between py-4"
      style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.25)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(37, 99, 235, 0.1)' }}
        >
          <Icon size={17} style={{ color: '#60a5fa' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{description}</p>
        </div>
      </div>
      <div className="ml-4 flex-shrink-0">{children}</div>
    </div>
  );
}

// Toggle switch estilizado
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{ background: checked ? '#2563eb' : 'rgba(55, 65, 81, 0.6)' }}
    >
      <span
        className="inline-block w-4 h-4 transform rounded-full bg-white transition-transform shadow-sm"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

/**
 * Página de Configurações
 * Tela básica de configurações do sistema.
 */
export default function Configuracoes() {
  const [config, setConfig] = useState({
    notifEmail: true,
    notifWhatsapp: false,
    notifVencimentos: true,
    modoEscuro: true,
    backupAuto: true,
    nomeAcademia: 'Academia Força Total',
    cnpj: '12.345.678/0001-99',
    telefone: '(11) 3456-7890',
  });

  const toggle = (key) => setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  return (
    <div className="p-4 lg:p-6 space-y-5 page-enter">
      <div>
        <h3 className="text-xl font-bold text-white">Configurações</h3>
        <p className="text-sm" style={{ color: '#6b7280' }}>Gerencie as preferências do seu sistema</p>
      </div>

      {/* Dados da Academia */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(22, 27, 39, 0.8)', border: '1px solid rgba(55, 65, 81, 0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={17} style={{ color: '#60a5fa' }} />
          <h4 className="font-semibold text-white text-sm">Dados da Academia</h4>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Nome da Academia</label>
            <input className="input-field" value={config.nomeAcademia} onChange={e => update('nomeAcademia', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>CNPJ</label>
              <input className="input-field" value={config.cnpj} onChange={e => update('cnpj', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Telefone</label>
              <input className="input-field" value={config.telefone} onChange={e => update('telefone', e.target.value)} />
            </div>
          </div>
          <button className="btn-primary mt-2">
            <Save size={14} /> Salvar Dados
          </button>
        </div>
      </div>

      {/* Notificações */}
      <div className="rounded-xl px-5 py-2" style={{ background: 'rgba(22, 27, 39, 0.8)', border: '1px solid rgba(55, 65, 81, 0.4)' }}>
        <div className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.3)' }}>
          <Bell size={17} style={{ color: '#60a5fa' }} />
          <h4 className="font-semibold text-white text-sm">Notificações</h4>
        </div>
        <SettingItem icon={Bell} title="Notificações por E-mail" description="Receba alertas de vencimentos por e-mail">
          <Toggle checked={config.notifEmail} onChange={() => toggle('notifEmail')} />
        </SettingItem>
        <SettingItem icon={Bell} title="Notificações por WhatsApp" description="Envio automático para alunos inadimplentes">
          <Toggle checked={config.notifWhatsapp} onChange={() => toggle('notifWhatsapp')} />
        </SettingItem>
        <SettingItem icon={Bell} title="Alerta de Vencimentos" description="Notificar 3 dias antes do vencimento">
          <Toggle checked={config.notifVencimentos} onChange={() => toggle('notifVencimentos')} />
        </SettingItem>
      </div>

      {/* Aparência e Sistema */}
      <div className="rounded-xl px-5 py-2" style={{ background: 'rgba(22, 27, 39, 0.8)', border: '1px solid rgba(55, 65, 81, 0.4)' }}>
        <div className="flex items-center gap-2 py-3" style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.3)' }}>
          <Palette size={17} style={{ color: '#60a5fa' }} />
          <h4 className="font-semibold text-white text-sm">Sistema</h4>
        </div>
        <SettingItem icon={Palette} title="Modo Escuro" description="Interface com tema escuro (recomendado)">
          <Toggle checked={config.modoEscuro} onChange={() => toggle('modoEscuro')} />
        </SettingItem>
        <SettingItem icon={Shield} title="Backup Automático" description="Salvar dados automaticamente toda noite">
          <Toggle checked={config.backupAuto} onChange={() => toggle('backupAuto')} />
        </SettingItem>
      </div>

      {/* Versão do sistema */}
      <div className="text-center py-4">
        <p className="text-xs" style={{ color: '#4b5563' }}>GymFlow v1.0.0 · Desenvolvido com ❤️ para academias</p>
      </div>
    </div>
  );
}
