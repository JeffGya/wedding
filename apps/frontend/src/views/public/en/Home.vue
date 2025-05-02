<template>
  <div class="home">
    <section class="hero">
      <h1>Welcome to Our Wedding Website!</h1>
      <p>Your one-stop place for all things about our special day.</p>
      <button class="cta-button">RSVP Now</button>
    </section>

    <section class="story">
      <h2>Our Story</h2>
      <p>It all started on a warm summer day...</p>
      <p>
        We met in 2015 and since then, we've had countless adventures together, from spontaneous road trips to quiet nights at home. Our journey together has been incredible, and we can't wait to celebrate it with you.
      </p>
    </section>

    <section class="details">
      <h2>Event Details</h2>
      <ul>
        <li><strong>Date:</strong> June 25, 2025</li>
        <li><strong>Venue:</strong> The Grand Hall, Main Street</li>
        <li><strong>Time:</strong> 5:00 PM</li>
      </ul>
    </section>

    <section class="rsvp">
      <h2>RSVP</h2>
      <p>We would love to have you with us! Please let us know if you can attend.</p>
      <button class="cta-button">RSVP Now</button>
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
