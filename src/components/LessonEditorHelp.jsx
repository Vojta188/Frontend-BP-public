import React from "react";

export default function LessonEditorHelp() {
  return (
    <details className="lessonHelp">
      <summary>Jak fungují obtížnost, uložení a schválení?</summary>
      <div className="lessonHelpGrid">
        <div>
          <h3>Obtížnost otázek</h3>
          <p><strong>Lehké</strong> otázky ověřují pojmy a informace. <strong>Náročnější</strong> otázky vyžadují souvislosti, porovnání nebo použití již získaných znalostí. Obě úrovně se vztahují ke zvolené věkové skupině.</p>
          <p>Obtížnost navrhuje AI a učitel ji může změnit u každé otázky. Při online testu aplikace při úspěšnosti alespoň 70 % v aktuálním pokusu přednostně nabídne náročnější otázku, jinak lehkou. Po vyčerpání dané úrovně nabídne ostatní nezodpovězené otázky. Žák postupně projde všechny otázky testu.</p>
        </div>
        <div>
          <h3>Uložit rozpracovanou lekci</h3>
          <p>Uloží název, výklady, věkovou skupinu, zařazení do třídy a všechny otázky. Lekce zůstane rozpracovaná a žáci ji zatím neuvidí. Později lze lekci znovu otevřít v přehledu otázek.</p>
          <h3>Uložit a schválit</h3>
          <p>Uloží aktuální změny a po kontrole zpřístupní lekci přiřazeným žákům. Přiřazení žáků potvrzuješ samostatným tlačítkem „Uložit přiřazení“.</p>
          <p>Schválenou lekci lze vrátit k úpravám, dokud ji nikdo nezačal vyplňovat a nemá QR relaci. Poté je možnost vytvořit upravitelnou kopii, aby původní výsledky zůstaly navázané na stejné otázky. Z připravené lekce lze spustit více samostatných testování.</p>
        </div>
      </div>
    </details>
  );
}
