

<template>
  <div class="home">
    <section class="hero">
      <h1>Sveiki atvykę į mūsų vestuvių svetainę!</h1>
      <p>Jūsų vieta sužinoti viską apie mūsų ypatingą dieną.</p>
      <button class="cta-button">RSVP Dabar</button>
    </section>

    <section class="story">
      <h2>Kaip mes susitikome</h2>
      <p>Viskas prasidėjo šiltą vasaros dieną...</p>
      <p>
        Susitikome 2015 metais, ir nuo to laiko turėjome neįtikėtinų nuotykių kartu – nuo spontaniškų kelionių iki tylų vakarą namuose. Mūsų kelionė kartu buvo nuostabi, ir mes negalime laukti, kada galėsime švęsti ją su jumis.
      </p>
    </section>

    <section class="details">
      <h2>Įvykio informacija</h2>
      <ul>
        <li><strong>Data:</strong> 2025 m. birželio 25 d.</li>
        <li><strong>Vieta:</strong> Didžioji salė, Pagrindinė gatvė</li>
        <li><strong>Laikas:</strong> 17:00 val.</li>
      </ul>
    </section>

    <section class="rsvp">
      <h2>RSVP</h2>
      <p>Mes norėtume, kad būtumėte su mumis! Prašome pranešti, jei galėsite dalyvauti.</p>
      <button class="cta-button">RSVP Dabar</button>
    </section>
  </div>
</template>

<script>
export default {
  name: "Home",
};
</script>

<style scoped>
.home {
  font-family: Arial, sans-serif;
  margin: 0 auto;
  max-width: 900px;
  padding: 20px;
}

.hero {
  background-color: #f8f9fa;
  padding: 40px;
  text-align: center;
}

.hero h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
}

.hero p {
  font-size: 1.2em;
  margin-bottom: 20px;
}

.cta-button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  font-size: 1.1em;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.cta-button:hover {
  background-color: #0056b3;
}

section {
  margin-bottom: 40px;
}

h2 {
  font-size: 2em;
  margin-bottom: 15px;
}

ul {
  list-style: none;
  padding-left: 0;
}

ul li {
  margin-bottom: 10px;
}
</style>