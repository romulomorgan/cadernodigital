'use client';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-2xl border-4 border-white">
          <img 
            src="https://customer-assets.emergentagent.com/job_ministry-ledger/artifacts/nuvau05n_LOGO%20IUDP.jpg" 
            alt="IUDP Logo" 
            className="w-28 h-28 rounded-full object-cover"
          />
        </div>
        <h1 className="text-4xl font-bold mb-2">Caderno de Controle Online</h1>
        <p className="text-xl text-yellow-300 mb-8">Igreja Unida Deus Proverá</p>
        <p className="text-lg text-blue-200 italic">"Gestão e transparência para a obra de Deus"</p>
        <div className="mt-12">
          <p className="text-sm text-blue-300">Sistema em restauração...</p>
          <p className="text-xs text-blue-400 mt-2">Aguarde enquanto aplicamos as correções</p>
        </div>
      </div>
    </div>
  );
}
