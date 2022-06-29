<template lang="pug">
div
  .hero.section
    h1.hero__h1 #[strong Denis Fadeev] designs and&nbsp;develops software for&nbsp;the&nbsp;web
  .appstore.section
    img(src="~/assets/appstore-screenshot.jpg" alt="Screenshot of App Store").appstore__screenshot
    .appstore__desc
      p Prototype of the App Store I built to see how well desktop-grade layouts and page transitions can be handled using the web platform.
      a(href="https://github.com/fadeev/appstore" target="_blank" rel="noopener noreferrer").appstore__desc__github
        icon-github.appstore__icon
        span Source
  .things__container
    .things
      .things__section
        .things__left
          div(style="flex-grow: 1;")
            .things__h1
              icon-things.things__icon
              h2 Things
            p.things__p A web app that replicates the look and feel of a popular desktop application.
          a(href="https://github.com/fadeev/things" target="_blank" rel="noopener noreferrer").things__footer
            icon-github.things__footer__icon
            span Source
      div(style="display: flex; justify-content: flex-end; align-self: flex-start")
        img(src="~/assets/things-screenshot.png" alt="Screenshot of Things app").things__screenshot
  .phone.section
    div
      img(src="~/assets/phone-screenshot.png" alt="Image of a phone").phone__screenshot
    .phone__section
      p.phone__p For a while I’ve worked at an enterprise software company. I’ve designed a user interface for an application that is used to design other applications. Around 50 screens worth of UI.
      p.phone__p My relationship with the company has ended. The app development is an ongoing project for the company.
  .planet.section
    .planet__animation
      planet
  .details.section
    .details__container
      h2.details__h1 How to get in touch with you?
      p.details__p The old-fashioned way: shoot me an email at #[a(href="mailto:denis@fadeev.org").link__underline denis@fadeev.org]
      p.details__p You can also reach me on #[a(href="https://github.com/fadeev" target="_blank" rel="noopener noreferrer") #[icon-github.details__icon] GitHub], #[a(href="https://instagram.com/fadeev_org" target="_blank" rel="noopener noreferrer") #[icon-instagram.details__icon] Instagram], #[a(href="https://t.me/dfadeev" target="_blank" rel="noopener noreferrer") #[icon-telegram.details__icon] Telegram] and #[a(href="https://www.linkedin.com/in/denis-fadeev/" target="_blank" rel="noopener noreferrer") #[icon-linkedin.details__icon] LinkedIn].
</template>

<style lang="stylus">
html
  font-family "Inter var", "Inter", --apple-system, sans-serif

body
  margin 0

*
  box-sizing border-box

a
  color initial
  text-decoration none

h1, h2, h3, h4, h5, h6
  font-weight normal
</style>

<style lang="stylus" scoped>
a
  white-space nowrap

.link__underline
  color #007AFF
  padding-bottom 3px
  box-shadow inset 0 -1px 0 0 #007AFF

strong
  font-weight 500

.section
  width 100%
  max-width 1440px
  margin-left auto
  margin-right auto

.hero
  padding 280px 100px
  position relative

  &__h1
    font-size 1.5rem
    margin-bottom 2rem
    max-width 26rem
    width 100%
    line-height 1.5

.appstore
  margin-bottom 130px

  &__screenshot
    width 100%
    display block

  &__desc
    padding 50px 100px 0
    width 100%
    max-width 720px
    line-height 1.5

    &__github
      display flex
      grid-auto-flow column
      align-items center
      gap .5rem
      font-weight 600
      opacity .25
      margin-top 40px

  &__icon
    height 1.5rem
    width 1.5rem
    margin-right .5rem

.things__container
  background #D5D9DE

.things
  padding-top 30px
  max-width 1792px
  margin-left auto
  margin-right auto
  padding-bottom 40px
  display grid
  grid-template-columns 50% 50%

  &__section
    display flex
    justify-content flex-end
    overflow-x hidden

  &__left
    width calc(1440px / 2)
    padding 50px 100px
    display flex
    justify-content flex-start
    flex-direction column

  &__footer
    display flex
    grid-auto-flow column
    align-items center
    font-weight 600
    opacity .25
    margin-top 25px

    &__icon
      height 1.5rem
      width 1.5rem
      margin-right .5rem

  &__icon
    width 4rem
    height auto
    position absolute
    margin-right 20px
    transform translate(-80px, 0)

  &__h1
    font-size 2.5rem
    font-weight 700
    color #3A4048
    margin-bottom 2rem
    position relative
    display flex
    align-items center

  &__p
    color #3A4048
    max-width 400px
    line-height 1.5

  &__screenshot
    width 100%
    height 100%

.phone
  margin-top 200px
  margin-bottom 200px
  display grid
  grid-template-columns 40% 60%

  &__screenshot
    width 100%
    display block

  &__p
    margin-bottom 2rem
    width 100%
    max-width 550px
    line-height 1.5

  &__section
    padding 100px

.planet
  background #020527
  overflow hidden
  border-radius 10px
  margin-bottom 200px

  &__animation
    transform translateX(300px)

.details
  padding-left 100px
  padding-right 100px
  margin-bottom 200px
  color #222222
  line-height 1.5

  &__container
    width 100%
    max-width 550px

  &__h1
    font-size 1.5rem
    margin-bottom 1rem

  &__p
    line-height 1.5
    margin-bottom .5rem

  &__icon
    width 1rem
    height 1rem
    vertical-align -12%

@media screen and (max-width: 1440px)
  .planet
    border-radius 0

@media screen and (max-width: 1000px)
  .hero
    padding-top 100px
    padding-bottom 100px

  .phone
    margin-top 100px
    margin-bottom 100px

    &__section
      padding 30px

  .planet
    margin-top 100px
    margin-bottom 100px

    &__animation
      transform initial

@media screen and (max-width: 700px)
  .hero
    padding 70px 30px

  .appstore
    margin-bottom 50px

    &__desc
      padding-left 30px
      padding-right 30px

  .things
    display block

    &__section
      justify-content flex-start

    &__icon
      position relative
      transform initial

    &__left
      padding 30px

  .phone
    display block
    margin-top initial
    margin-bottom 50px

    &__section
      padding 30px

  .planet
    margin-top 50px
    margin-bottom 50px

  .details
    padding-left 30px
    padding-right 30px
</style>

<script>
import IconIgnite from '@/components/IconIgnite'
import IconGithub from '@/components/IconGithub'
import IconInstagram from '@/components/IconInstagram'
import IconThings from '@/components/IconThings'
import IconTelegram from '@/components/IconTelegram'
import IconLinkedin from '@/components/IconLinkedin'
import Planet from '@/components/Planet'

export default {
  components: {
    IconIgnite,
    IconGithub,
    IconThings,
    IconInstagram,
    IconTelegram,
    IconLinkedin,
    Planet,
  },
}
</script>
