export default function Header() {
    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]">
            <div className="bg-black/70 backdrop-blur-md border border-rover-cyan/60 rounded-xl px-10 py-3 shadow-lg shadow-rover-cyan/20"
                style={{ boxShadow: '0 0 24px rgba(0,255,225,0.15), inset 0 1px 0 rgba(0,255,225,0.1)' }}>
                <h1 className="text-rover-cyan text-2xl font-bold tracking-widest text-center "
                    style={{ textShadow: '0 0 20px rgba(0,255,225,0.8), 0 0 40px rgba(0,255,225,0.4)' }}>
                    NEXUS PRIME
                </h1>
            </div>
        </div>
    );
}
