import Navbar from "./Navbar";

const Home = () => {
  return (
    <div>
      {/* <Navbar /> */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          Vitaj vo filmovom odporúčacom experimente!
        </h1>

        <div className="bg-blue-50 p-4 rounded-lg shadow-sm mb-6">
          <p className="text-md italic">
            Tento systém vznikol ako súčasť mojej bakalárky, kde skúmam, aké
            odporúčacie algoritmy budú generovať najlepšie odporúčania. Zapojením
            sa mi pomôžeš získať cenné dáta a zároveň môžeš objaviť nové
            filmy na pozeranie.
          </p>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">Ako to celé prebieha:</h2>

          <ol className="list-decimal pl-6 space-y-4">
            <li className="text-lg">
              <span className="font-medium">Registrácia a prihlásenie</span> –
              Najprv si vytvoríš anonymný účet, aby si si mohol uložiť svoje
              filmové preferencie.
            </li>

            <li className="text-lg">
              <span className="font-medium">Krátky dotazník</span> – Vyberieš si
              obľúbené žánre a obdobia, ktoré by mali filmy vygenerované pre teba spĺňať.
              Pomôže to systému lepšie ťa spoznať.
            </li>

            <li className="text-lg">
              <span className="font-medium">Ohodnotenie pár filmov</span> –
              Pozrieš sa na 5 filmov a ohodnotíš ich od 1 do 5 hviezdičiek. Na
              základe toho začne systém pracovať.
            </li>

            <li className="text-lg">
              <span className="font-medium">Porovnanie odporúčaní</span> –
              Ukážem ti dve sady odporúčaných filmov – jednu od neurónovej siete
              a druhú od klasického algoritmu. Ty rozhodneš, ktorá ti viac
              sadla.
            </li>
          </ol>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4">Prečo je to dôležité?</h2>
          <p className="text-lg mb-4">
            Mojím cieľom je porovnať tradičné odporúčacie metódy s tými, ktoré
            využívajú neurónové siete. Tvoje odpovede mi pomôžu zistiť, čo
            naozaj funguje a čo nie – a možno aj prispieť k tomu, aby sme všetci
            dostávali lepšie tipy na filmy.
          </p>
          <p className="text-lg">
            Všetko je úplne anonymné a slúži výlučne na účely mojej bakalárskej
            práce.
          </p>
        </div>

        <div className="bg-green-50 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Poďme na to!</h2>
          <p className="text-lg">
            Klikni hore na „Registrovať sa“ a poď si to vyskúšať – pomôžeš výskumu
            a možno objavíš svoj nový obľúbený film. 🙂
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
