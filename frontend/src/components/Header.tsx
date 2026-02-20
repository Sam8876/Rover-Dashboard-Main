import nexusLogo from '../assets/nexuslogo.png';

export default function Header() {
    return (
        <div className="fixed top-4 left-4 z-[9999]">
            <div className="bg-white border border-white/80 rounded-xl px-5 py-2.5 shadow-lg flex items-center gap-3">
                {/* Logo — rendered at full size, no internal padding squishing it */}
                <img
                    src={nexusLogo}
                    alt="Nexus Logo"
                    className="h-12 w-12 rounded-md object-contain shrink-0"
                    style={{ imageRendering: 'crisp-edges' }}
                />
                {/* Title */}
                <h1
                    className="text-2xl tracking-widest"
                    style={{
                        fontFamily: "'VA-I', monospace",
                        color: '#0a4fff',
                        letterSpacing: '0.18em',
                    }}
                >
                    NEXUS PRIME
                </h1>
            </div>
        </div>
    );
}
