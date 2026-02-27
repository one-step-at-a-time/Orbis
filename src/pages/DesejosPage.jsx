import React, { useState, useMemo } from 'react';
import { Plus, ShoppingBag, CheckCircle2, Circle, Trash2, ExternalLink, Pencil, Calendar, Tag, Star } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { NewWishModal } from '../components/Modals';
import { useAppData } from '../context/DataContext';
import { formatCurrency } from '../utils/formatters';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_LABELS = {
    casa: '🏠 Casa',
    eletronicos: '💻 Eletrônicos',
    pessoal: '👤 Pessoal',
    saude: '❤️ Saúde',
    lazer: '🎮 Lazer',
    moda: '👗 Moda',
    outros: '📦 Outros',
};

const PRIO_CONFIG = {
    alta:  { label: 'Alta',  color: '#ef4444', dot: '🔴' },
    media: { label: 'Média', color: '#f59e0b', dot: '🟡' },
    baixa: { label: 'Baixa', color: '#22c55e', dot: '🟢' },
};

function formatMes(mes) {
    if (!mes) return 'Sem data planejada';
    const [year, month] = mes.split('-');
    const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${names[parseInt(month, 10) - 1]} ${year}`;
}

// ── WishItem ──────────────────────────────────────────────────────────────────

function WishItem({ wish, onToggle, onEdit, onDelete }) {
    const isDone = wish.status === 'comprado';
    const prio = PRIO_CONFIG[wish.prioridade] || PRIO_CONFIG.media;

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '12px 14px',
            borderRadius: 8,
            background: isDone ? 'rgba(0,255,157,0.03)' : 'rgba(0,240,255,0.04)',
            border: `1px solid ${isDone ? 'rgba(0,255,157,0.12)' : 'rgba(0,240,255,0.1)'}`,
            opacity: isDone ? 0.6 : 1,
            transition: 'all 0.2s',
        }}>
            {/* Checkbox */}
            <button
                onClick={() => onToggle(wish)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, flexShrink: 0 }}
                title={isDone ? 'Marcar como pendente' : 'Marcar como comprado'}
            >
                {isDone
                    ? <CheckCircle2 size={18} color="#00FF9D" />
                    : <Circle size={18} color="rgba(0,240,255,0.4)" />
                }
            </button>

            {/* Conteúdo */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                        {wish.titulo}
                    </span>
                    {/* Prioridade badge */}
                    <span style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 10,
                        background: `${prio.color}18`, color: prio.color,
                        border: `1px solid ${prio.color}30`,
                        fontFamily: 'var(--font-system)', letterSpacing: '0.05em',
                    }}>
                        {prio.dot} {prio.label}
                    </span>
                    {/* Categoria badge */}
                    <span style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 10,
                        background: 'rgba(0,240,255,0.06)', color: 'var(--text-muted)',
                        border: '1px solid rgba(0,240,255,0.12)',
                        fontFamily: 'var(--font-system)',
                    }}>
                        {CAT_LABELS[wish.categoria] || wish.categoria}
                    </span>
                </div>

                {wish.descricao && (
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '3px 0 0', lineHeight: 1.4 }}>
                        {wish.descricao}
                    </p>
                )}
            </div>

            {/* Preço */}
            {wish.preco != null && (
                <span style={{
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                    color: isDone ? '#00FF9D' : 'var(--primary)',
                    fontFamily: 'var(--font-system)',
                }}>
                    {formatCurrency(wish.preco)}
                </span>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {wish.link && (
                    <a href={wish.link} target="_blank" rel="noopener noreferrer"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--primary)', display: 'flex', alignItems: 'center' }}
                        title="Abrir link de compra">
                        <ExternalLink size={14} />
                    </a>
                )}
                <button onClick={() => onEdit(wish)} title="Editar"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-dim)' }}>
                    <Pencil size={13} />
                </button>
                <button onClick={() => onDelete(wish.id)} title="Excluir"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(239,68,68,0.5)' }}>
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

// ── MonthCard ─────────────────────────────────────────────────────────────────

function MonthCard({ mes, items, onToggle, onEdit, onDelete }) {
    const pendentes = items.filter(w => w.status !== 'comprado');
    const comprados = items.filter(w => w.status === 'comprado');
    const totalPendente = pendentes.reduce((s, w) => s + (w.preco || 0), 0);
    const [showComprados, setShowComprados] = useState(false);

    return (
        <div style={{
            borderRadius: 12,
            border: '1px solid rgba(0,240,255,0.14)',
            background: 'linear-gradient(135deg, rgba(0,5,8,0.98), rgba(0,10,15,0.98))',
            overflow: 'hidden',
        }}>
            {/* Header do mês */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0,240,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(0,240,255,0.04)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={14} color="var(--primary)" />
                    <span style={{
                        fontSize: 13, fontWeight: 700, color: 'var(--primary)',
                        fontFamily: 'var(--font-system)', letterSpacing: '0.08em',
                    }}>
                        {formatMes(mes)}
                    </span>
                    <span style={{
                        fontSize: 10, color: 'var(--text-dim)',
                        fontFamily: 'var(--font-system)',
                        padding: '1px 8px', borderRadius: 10,
                        background: 'rgba(0,240,255,0.06)',
                        border: '1px solid rgba(0,240,255,0.1)',
                    }}>
                        {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                </div>
                {totalPendente > 0 && (
                    <span style={{
                        fontSize: 12, fontWeight: 700, color: '#f59e0b',
                        fontFamily: 'var(--font-system)',
                    }}>
                        {formatCurrency(totalPendente)} pendente{pendentes.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Itens pendentes */}
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendentes.length === 0 && comprados.length > 0 && (
                    <p style={{ fontSize: 12, color: '#00FF9D', textAlign: 'center', padding: '8px 0' }}>
                        ✅ Todos os itens deste mês foram comprados!
                    </p>
                )}
                {pendentes.map(wish => (
                    <WishItem key={wish.id} wish={wish} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
                ))}

                {/* Itens comprados — colapsável */}
                {comprados.length > 0 && (
                    <>
                        <button
                            onClick={() => setShowComprados(v => !v)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: 11, color: 'var(--text-dim)', padding: '4px 0',
                                textAlign: 'left', fontFamily: 'var(--font-system)', letterSpacing: '0.06em',
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                            <CheckCircle2 size={12} color="#00FF9D" />
                            {showComprados ? '▾' : '▸'} {comprados.length} comprado{comprados.length !== 1 ? 's' : ''}
                        </button>
                        {showComprados && comprados.map(wish => (
                            <WishItem key={wish.id} wish={wish} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

// ── DesejosPage ───────────────────────────────────────────────────────────────

export function DesejosPage() {
    const { wishes, addWish, updateWish, deleteWish } = useAppData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editWish, setEditWish] = useState(null);

    // Agrupa por mês, mantendo ordem cronológica
    const grouped = useMemo(() => {
        const map = {};
        wishes.forEach(w => {
            const key = w.mes || '__sem_data';
            if (!map[key]) map[key] = [];
            map[key].push(w);
        });

        // Ordena: meses com data em ordem cronológica; "sem data" ao final
        const keys = Object.keys(map).sort((a, b) => {
            if (a === '__sem_data') return 1;
            if (b === '__sem_data') return -1;
            return a.localeCompare(b);
        });

        return keys.map(k => ({ mes: k === '__sem_data' ? '' : k, items: map[k] }));
    }, [wishes]);

    // Stats
    const pendentes = wishes.filter(w => w.status !== 'comprado');
    const comprados = wishes.filter(w => w.status === 'comprado');
    const totalPendente = pendentes.reduce((s, w) => s + (w.preco || 0), 0);
    const totalComprado = comprados.reduce((s, w) => s + (w.preco || 0), 0);
    const proximoItem = [...pendentes].sort((a, b) => {
        const po = { alta: 0, media: 1, baixa: 2 };
        return (po[a.prioridade] ?? 1) - (po[b.prioridade] ?? 1);
    })[0];

    const handleToggle = (wish) => {
        updateWish(wish.id, { status: wish.status === 'comprado' ? 'desejado' : 'comprado' });
    };

    const handleEdit = (wish) => {
        setEditWish(wish);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditWish(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <PageHeader title="DESEJOS" subtitle="LISTA DE OBJETIVOS DE COMPRA" />
                <button className="btn btn-primary" onClick={() => { setEditWish(null); setIsModalOpen(true); }}>
                    <Plus size={16} /> Novo Desejo
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {[
                    {
                        label: 'ITENS PENDENTES',
                        value: pendentes.length,
                        sub: pendentes.length > 0 ? `${formatCurrency(totalPendente)} total` : 'Nenhum',
                        color: 'var(--primary)', bg: 'rgba(0,240,255,0.06)',
                        icon: <ShoppingBag size={18} color="var(--primary)" />,
                    },
                    {
                        label: 'COMPRADOS',
                        value: comprados.length,
                        sub: comprados.length > 0 ? `${formatCurrency(totalComprado)} gasto` : 'Nenhum ainda',
                        color: '#00FF9D', bg: 'rgba(0,255,157,0.06)',
                        icon: <CheckCircle2 size={18} color="#00FF9D" />,
                    },
                    {
                        label: 'PRÓXIMA AQUISIÇÃO',
                        value: proximoItem ? proximoItem.titulo : '—',
                        sub: proximoItem?.preco ? formatCurrency(proximoItem.preco) : proximoItem ? 'sem preço definido' : 'Adicione um desejo',
                        color: '#f59e0b', bg: 'rgba(245,158,11,0.06)',
                        icon: <Star size={18} color="#f59e0b" />,
                        small: !!proximoItem,
                    },
                ].map((s, i) => (
                    <div key={i} style={{
                        padding: '14px 16px', borderRadius: 10,
                        background: s.bg, border: `1px solid ${s.color}20`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            {s.icon}
                            <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-system)', letterSpacing: '0.14em' }}>
                                {s.label}
                            </span>
                        </div>
                        <div style={{ fontSize: s.small ? 14 : 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-system)', lineHeight: 1.2 }}>
                            {s.value}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* Lista agrupada por mês */}
            {grouped.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    color: 'var(--text-dim)',
                    border: '1px dashed rgba(0,240,255,0.15)',
                    borderRadius: 12,
                }}>
                    <ShoppingBag size={40} color="rgba(0,240,255,0.2)" style={{ marginBottom: 16 }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Lista de desejos vazia
                    </p>
                    <p style={{ fontSize: 13 }}>
                        Adicione coisas que você quer comprar — para você ou para sua casa.
                    </p>
                    <button className="btn btn-primary" style={{ marginTop: 20 }}
                        onClick={() => setIsModalOpen(true)}>
                        <Plus size={14} /> Adicionar primeiro desejo
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {grouped.map(({ mes, items }) => (
                        <MonthCard
                            key={mes || '__sem_data'}
                            mes={mes}
                            items={items}
                            onToggle={handleToggle}
                            onEdit={handleEdit}
                            onDelete={deleteWish}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                title={editWish ? 'Editar desejo' : 'Novo desejo'}
            >
                <NewWishModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    initial={editWish}
                />
            </Modal>
        </div>
    );
}
