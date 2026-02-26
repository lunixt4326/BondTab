import { useNavigate, Link } from 'react-router-dom';
import { useAccount, useConnect } from 'wagmi';
import { motion } from 'framer-motion';
import {
  Shield, Receipt, Users, CheckCircle, ArrowRight,
  Lock, Zap, Scale, DollarSign, Sparkles,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const float = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
};

export function Landing() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const handleConnect = () => {
    if (isConnected) {
      navigate('/app');
      return;
    }
    const injected = connectors.find((c) => c.id === 'injected' || c.name === 'MetaMask');
    if (injected) connect({ connector: injected });
    else if (connectors[0]) connect({ connector: connectors[0] });
  };

  return (
    <div className="min-h-screen bg-surface-950 overflow-hidden">
      {/* Full-page BG image with gradient overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: 'url(/bgbondtab.jpg)' }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-surface-950/80 via-surface-950/60 to-surface-950 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="BondTab" className="w-9 h-9 rounded-lg shadow-lg shadow-accent/10 group-hover:shadow-accent/25 transition-shadow" />
          <span className="font-display font-semibold text-base text-neutral-100 tracking-tight">
            BondTab
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <a href="#how-it-works" className="hidden sm:block text-xs text-neutral-400 hover:text-accent transition-colors">
            How it works
          </a>
          <a href="#features" className="hidden sm:block text-xs text-neutral-400 hover:text-accent transition-colors">
            Features
          </a>
          <button onClick={handleConnect} className="btn-primary text-xs">
            {isConnected ? 'Go to Dashboard' : 'Connect Wallet'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-28">
        {/* Animated glow orbs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-accent rounded-full blur-[160px] pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-32 right-0 w-[400px] h-[400px] bg-amber rounded-full blur-[140px] pointer-events-none"
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left text */}
          <div className="flex-1 max-w-xl">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6"
            >
              <Sparkles className="w-3 h-3 text-accent" />
              <span className="text-[11px] font-medium text-accent">
                Live on Polygon Mainnet
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="font-display font-semibold text-3xl md:text-4xl text-neutral-100 leading-tight mb-5"
            >
              Bonded expense splitting.
              <br />
              <span className="bg-gradient-to-r from-accent to-emerald-300 bg-clip-text text-transparent">
                Trustless by design.
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-sm text-neutral-400 leading-relaxed mb-8 max-w-md"
            >
              Each group member posts a refundable USDC bond. Expenses require receipt proof,
              can be challenged, and settle with one click. Your money stays honest.
            </motion.p>

            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-wrap gap-3"
            >
              <button onClick={handleConnect} className="btn-primary group">
                {isConnected ? 'Go to Dashboard' : 'Launch App'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <a href="#how-it-works" className="btn-secondary">
                Learn More
              </a>
            </motion.div>

            {/* Trust stats */}
            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex gap-6 mt-10 pt-6 border-t border-surface-700/30"
            >
              {[
                { label: 'Non-custodial', val: '100%' },
                { label: 'Gas chain', val: 'Polygon' },
                { label: 'Settlement', val: 'USDC' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-sm font-display font-semibold text-accent">{s.val}</div>
                  <div className="text-[10px] text-neutral-600 mt-0.5">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — floating logo card */}
          <motion.div
            variants={float}
            animate="animate"
            className="relative flex-shrink-0"
          >
            <div className="relative">
              {/* Glow ring behind logo */}
              <div className="absolute inset-0 m-auto w-48 h-48 rounded-3xl bg-accent/10 blur-2xl" />
              <div className="relative glass-card p-8 rounded-3xl border-accent/20 shadow-2xl shadow-accent/10">
                <img
                  src="/logo.png"
                  alt="BondTab"
                  className="w-40 h-40 md:w-52 md:h-52 object-contain drop-shadow-2xl"
                />
              </div>
              {/* Orbit badges */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 pointer-events-none"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge-accent text-[9px] shadow-lg">
                  <Shield className="w-2.5 h-2.5" /> Bonded
                </div>
              </motion.div>
              <div className="absolute -bottom-2 -right-2 badge-amber text-[9px] shadow-lg">
                <DollarSign className="w-2.5 h-2.5" /> USDC
              </div>
              <div className="absolute top-1/2 -left-3 -translate-y-1/2 badge-accent text-[9px] shadow-lg">
                <Lock className="w-2.5 h-2.5" /> Secure
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-800/60 border border-surface-700/40 mb-4"
          >
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">How it works</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-semibold text-xl text-neutral-100"
          >
            Three steps to trustless splitting
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Lock,
              step: '01',
              title: 'Post Your Bond',
              desc: 'Each group member deposits a refundable USDC bond. This ensures accountability and enables enforcement.',
              color: 'text-accent',
              bg: 'bg-accent/10',
              border: 'hover:border-accent/30',
            },
            {
              icon: Receipt,
              step: '02',
              title: 'Submit Expenses',
              desc: 'Upload receipt proof, split costs, and propose expenses. Data is encrypted and stored on IPFS, hashed onchain.',
              color: 'text-amber',
              bg: 'bg-amber/10',
              border: 'hover:border-amber/30',
            },
            {
              icon: Scale,
              step: '03',
              title: 'Challenge or Settle',
              desc: 'Expenses can be challenged within a time window. Unchallenged expenses finalize. Settle with one click.',
              color: 'text-accent',
              bg: 'bg-accent/10',
              border: 'hover:border-accent/30',
            },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={fadeUp}
              className={`glass-card p-6 group transition-all duration-300 ${item.border} hover:shadow-lg hover:shadow-accent/5`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="text-2xl font-display font-semibold text-surface-600/40">{item.step}</span>
              </div>
              <h3 className="font-display font-medium text-sm text-neutral-100 mb-2">{item.title}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Connection line decoration */}
        <div className="hidden md:flex items-center justify-center mt-8">
          <div className="flex items-center gap-2 text-[10px] text-neutral-600">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-accent/30" />
            <span>Fully onchain</span>
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-accent/30" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24 border-t border-surface-600/40">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-800/60 border border-surface-700/40 mb-4"
          >
            <span className="text-[10px] font-mono text-accent uppercase tracking-wider">Features</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display font-semibold text-xl text-neutral-100"
          >
            Everything you need for fair expense splitting
          </motion.h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Shield, title: 'Bond-Backed', desc: 'Deposits guarantee good-faith participation', accent: 'group-hover:border-accent/50' },
            { icon: Zap, title: 'One-Click Settle', desc: 'Computed net settlement in a single transaction', accent: 'group-hover:border-amber/50' },
            { icon: DollarSign, title: 'Native USDC', desc: 'Real stablecoin on Polygon — no wrapped tokens', accent: 'group-hover:border-accent/50' },
            { icon: Users, title: 'Group Governance', desc: 'Challenge expenses, vote on disputes, enforce rules', accent: 'group-hover:border-amber/50' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className={`group p-5 rounded-xl bg-surface-700/40 border border-surface-600/50 transition-all duration-300 ${item.accent} hover:bg-surface-700/70 hover:shadow-lg hover:shadow-accent/5`}
            >
              <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <item.icon className="w-4.5 h-4.5 text-accent drop-shadow-[0_0_4px_rgba(0,255,170,0.3)]" />
              </div>
              <h4 className="font-display font-medium text-sm text-white mb-1">{item.title}</h4>
              <p className="text-xs text-neutral-300 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-surface-600/40">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-accent/10">
              <Shield className="w-7 h-7 text-accent drop-shadow-[0_0_6px_rgba(0,255,170,0.4)]" />
            </div>
            <h2 className="font-display font-semibold text-lg text-neutral-100 mb-3">
              Security First
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed mb-6">
              All funds are held in auditable smart contracts on Polygon.
              Receipt data is encrypted client-side before IPFS upload.
              Only onchain hashes verify integrity.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {['Non-custodial', 'Encrypted receipts', 'Onchain disputes', 'Bond enforcement'].map((tag) => (
                <span key={tag} className="badge-accent text-[10px]">
                  <CheckCircle className="w-3 h-3" /> {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-10 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-amber/5 pointer-events-none" />
          <div className="relative z-10">
            <img src="/logo.png" alt="" className="w-12 h-12 mx-auto mb-4 rounded-lg opacity-80" />
            <h2 className="font-display font-semibold text-lg text-neutral-100 mb-2">
              Ready to split expenses fairly?
            </h2>
            <p className="text-xs text-neutral-300 mb-6 max-w-sm mx-auto">
              Connect your wallet, create a group, and start splitting expenses backed by real USDC bonds.
            </p>
            <button onClick={handleConnect} className="btn-primary group">
              {isConnected ? 'Open Dashboard' : 'Get Started'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-surface-600/40">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="" className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity rounded" />
            <span className="text-[11px] text-neutral-600 group-hover:text-neutral-400 transition-colors">
              BondTab · Polygon Mainnet · {new Date().getFullYear()}
            </span>
          </Link>
          <span className="text-[10px] text-neutral-700 font-mono">
            Chain ID 137
          </span>
        </div>
      </footer>
    </div>
  );
}
