<template>
  <div>
    <div class="header">
      <div class="title"><a href="mailto:denis@fadeev.org">denis@fadeev.org</a></div>
    </div>
    <div class="things">
      <div class="heading">
        <div class="icon">
          <svg class="check" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 12.116l2.053-1.897c2.401 1.162 3.924 2.045 6.622 3.969 5.073-5.757 8.426-8.678 14.657-12.555l.668 1.536c-5.139 4.484-8.902 9.479-14.321 19.198-3.343-3.936-5.574-6.446-9.679-10.251z"/></svg>
          <svg class="inbox" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"><path d="M21 0h-18l-3 13 2 11h20l2-11-3-13zm-16.409 2h14.818l2.308 10h-4.717l-2.25 3h-5.5l-2.25-3h-4.7170000000000005l2.308-10z"/></svg>
        </div>
        <div class="title">
          <div class="subtitle">The same old</div>
          <div>Things<span class="light">.vue</span></div>
        </div>
      </div>
      <div class="description">
        <div class="paragraph">Things is the award-winning personal task manager for macOS.</div>
        <div class="paragraph">This projects aims to recreate Things for the web.</div>
      </div>
      <div class="screenshots">
        <div>
          <img class="screenshot" src="@/assets/screenshot-project.png" alt="Application screenshot">
        </div>
      </div>
      <div class="demo">
        <div class="title">
          <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/></svg>
          </div>
          <div>Inspired by Original Design</div>
        </div>
        <div class="paragraph">This is a replica of the original application that tries to emulate the design and experience using the web platform. No code or design elements of the original were used during development.</div>
        <div :class="{todo: true, enter: scroll, leave: !scroll}">
          <Todo ref="todo" :area="true" :data="todo" :tags="['Travel', 'Fun', 'Errand', 'Important']"></Todo>
        </div>
      </div>
      <div class="details">
        <div>
          <img class="screenshot" src="@/assets/screenshot-upcoming.png" alt="Application screenshot">
        </div>
        <div>
          <div class="text">This application is basically alpha, so expect things to break. Do not expect things not to break.</div>
          <div class="text">I've used <a href="https://vuejs.org/">Vue</a> for the framework and <a href="https://vuex.vuejs.org/">Vuex</a> for storage. Library smooth-dnd was used for drag and drop. Lodash was used for basically everything.</div>
          <div class="text">Icons from <a href="https://iconmonstr.com/license/">iconmonstr</a>, original design by <a href="https://culturedcode.com/">Cultured Code</a>.</div>
          <div class="text">Source on <a href="https://github.com/fadeev/things">GitHub</a>.</div>
        </div>
      </div>
    </div>
    <div class="waybill">
      <div class="title">Point of Sale App</div>
      <div class="screenshots" ref="waybill">
        <div :class="{enterSlideLeft: scrollWaybill, leaveSlideLeft: !scrollWaybill}">
          <img class="screenshot" src="@/assets/screenshot-waybill.png" alt="">
        </div>
        <div :class="{enterSlideRight: scrollWaybill, leaveSlideRight: !scrollWaybill}">
          <img class="screenshot offset" src="@/assets/screenshot-inventory.png" alt="">
        </div>
      </div>
      <div class="description">
        <div class="paragraph">Point of sale system with inventory, checkout, product management, label printing, sales analytics and more.</div>
        <div class="paragraph">Client application is written in JavaScript using Vue.js framework. Server logic is written in stored PL/pgSQL procedures in PostgreSQL database and a tiny Express.js server for handling HTTP-requests.</div>
        <div class="paragraph">It sure was a fun project to work on. Source code available upon request.</div>
      </div>
      <div class="video">
        <div class="container">
          <iframe class="iframe" src="https://www.youtube.com/embed/3Vyyca0OFi8?rel=0&amp;controls=1&amp;showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .header { font-family: "Roboto", sans-serif; background: rgb(242,245,247); display: flex; align-items: center; }
  .header .title { background: black; color: white; display: inline-block; font-weight: 900; padding: 10px; margin: 20px; }
  .header .title a { color: white; text-decoration: none; }

  .things { background: linear-gradient(rgb(242,245,247), rgb(213,217,222)); padding: 75px 0 0; font-family: "Roboto", sans-serif; }
  .things .heading { justify-content: center; display: flex; align-items: flex-end; color: rgb(48,51,54); }
  .things .heading .icon { margin: 5px 15px; position: relative; display: inline-block; width: 64px; height: 64px; }
  .things .heading .icon .check { position: absolute; left: 25%; width: 50%; top: 15%; }
  .things .heading .icon .inbox { position: absolute; left: 0; top: 0; fill: rgb(34, 116, 229); }
  .things .heading .subtitle { font-size: 22px; font-weight: normal; }
  .things .heading .title { font-size: 64px; font-weight: 900; }
  .things .heading .title .light { color: rgba(48,51,54,.25); }
  .things .description { margin: 50px 0; font-size: 22px; text-align: center; }
  .things .description .paragraph { margin: 5px 0; line-height: 1.5; }
  .things .screenshots { padding: 0 20px; display: flex; justify-content: center; }
  .things .screenshots .screenshot { max-width: 800px; width: 100%; border-radius: 5px; box-shadow: 0 10px 50px 0px rgba(0,0,0,.15); }
  .things .demo { background: rgb(242,245,247); margin: 50px 0 0; padding: 50px 0; }
  .things .demo .paragraph { max-width: 700px; margin: 35px auto; font-size: 18px; line-height: 1.5; }
  .things .demo .title { margin-top: 50px; display: flex; justify-content: center; align-items: center; }
  .things .demo .title .icon { fill: rgb(255,211,0); margin: 0 10px; }
  .things .demo .title { font-size: 32px; font-weight: 700; }
  .things .demo .todo { max-width: 600px; margin: 50px auto 0; }
  .things .details { padding: 50px 20px; background: white; display: flex; justify-content: center; }
  .things .details .screenshot { margin-bottom: 50px; max-width: 500px; width: 100%; border-radius: 5px; box-shadow: 0 10px 50px 0px rgba(0,0,0,.15); }
  .things .details .text { margin-left: 50px; max-width: 500px; font-size: 18px; margin-bottom: 20px; line-height: 1.5; }

  .waybill { background: black; color: white; padding: 50px 0 50px; font-family: "PT Serif", serif; }
  .waybill .title { font-size: 48px; text-align: center; padding: 50px 20px 25px; }
  .waybill .screenshots { flex-wrap: nowrap; overflow: hidden; padding: 20px 20px; display: flex; justify-content: center; }
  .waybill .screenshots .screenshot { box-sizing: border-box; box-shadow: 0 10px 50px 0px rgba(0,0,0,.15); margin: 10px; width: 100%; max-width: 600px; background: white; padding: 5px 10px; border-radius: 5px; }
  .waybill .screenshots .screenshot.offset { transform: translateX(-50px) translateY(30px); }
  .waybill .description { max-width: 1000px; margin: 0 auto; padding: 75px 20px 25px; font-size: 24px; }
  .waybill .description .paragraph { margin-bottom: 25px; }
  .waybill .video { margin: 0 auto; width: 100%; max-width: 800px; padding: 50px 0; }
  .waybill .video .container { position: relative; width: 100%; height: 0; padding-bottom: 56.25%; }
  .waybill .video .container .iframe { position:absolute;top:0;left:0;width:100%;height:100%; }

  @media (max-width: 600px) {
    .things .heading { flex-direction: column; align-items: center; text-align: center; }
    .things .heading .icon { margin-bottom: 25px; }
    .things .demo { padding: 20px; }
    .things .demo .icon { padding-bottom: 20px; }
    .things .demo .title { flex-direction: column; text-align: center; }
    .things .details { flex-direction: column; padding: 50px 20px; }
    .things .details .screenshot { margin: 0 auto 50px; }
    .things .details .text { margin-left: 0; }
    .waybill .screenshots { flex-direction: column; padding-bottom: 0; }
    .waybill .screenshots .screenshot { margin: 0 0 20px; }
    .waybill .screenshots .screenshot.offset { transform: none; }
    .waybill .description { padding-top: 20px; }
    .waybill .video { padding: 0; }
  }

  .enter { animation: enter 1s forwards; }
  .leave { animation: leave .5s forwards; }
  .enterSlideLeft { animation: enterSlideLeft 1s forwards; }
  .enterSlideRight { animation: enterSlideRight 1s forwards; }
  .leaveSlideLeft { animation: leaveSlideLeft 1s forwards; }
  .leaveSlideRight { animation: leaveSlideRight 1s forwards; }

  @keyframes enter {
    0% { opacity: 0; transform: scale(.5); }
    50% { transform: scale(1.05); }
    100% { opacity: 1; }
  }

  @keyframes leave {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes enterSlideLeft {
    0% { transform: translateX(-200px); opacity: 0; }
    75% { opacity: 1; }
    100% {transform: translateX(0); opacity: 1; }
  }

  @keyframes enterSlideRight {
    0% { transform: translateX(200px); opacity: 0; }
    75% { opacity: 1; }
    100% {transform: translateX(0); opacity: 1; }
  }

  @keyframes leaveSlideLeft {
    0% { transform: translateX(0); opacity: 1; }
    75% { opacity: 0; }
    100% {transform: translateX(-200px); opacity: 0; }
  }

  @keyframes leaveSlideRight {
    0% { transform: translateX(0); opacity: 1; }
    75% { opacity: 0; }
    100% {transform: translateX(200px); opacity: 0; }
  }

</style>

<script>
  import Todo from "./components/Todo.vue"

  export default {
    components: { Todo },
    created() {
      window.addEventListener("scroll", this.handleScroll)
    },
    methods: {
      handleScroll() {
        if (this.$refs["todo"]) {
          this.scroll = window.innerHeight/1.5 > this.$refs["todo"].$el.offsetTop - window.pageYOffset
        }
        if (this.$refs["waybill"]) {
          this.scrollWaybill = window.innerHeight/1.5 > this.$refs["waybill"].offsetTop - window.pageYOffset
        }
      },
    },
    data: function() {
      return {
        scroll: null,
        scrollWaybill: null,
        todo: {
          name: "Book hotels",
          deadline: null,
          description: "Make sure they are central, have Wifi, and are close to a subway station.",
          checklist: [
            {
              name: "London from June 3",
            },
            {
              name: "Paris from June 10",
            },
            {
              name: "Berlin from Jue 17",
            },
          ],
          date: new Date().toISOString().substring(0,10)
        }
      }
    },
  }
</script>
