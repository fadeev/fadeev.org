<template>
  <div>
    <div class="container">
      <div class="system">
        <div class="orbit__small__container">
          <div class="orbit__small"></div>
          <div class="orbit__small__satellite"></div>
        </div>
        <div class="orbit__container">
          <div v-for="i in 3" :key="i" :style="{'--satelite-rotate': i * 360 / 3 + 'deg'}" class="satellite__container">
            <div class="satellite"></div>
          </div>
          <div v-for="i in 3" :key="i" :style="{'--satelite-rotate': (i + .5) * 360 / 3 + 'deg'}" class="satellite__container satellite__container__small">
            <div class="satellite__small"></div>
          </div>
        </div>
        <div class="planet planet__front"></div>
        <div class="planet"></div>
        <div class="orbit__large"></div>
        <div class="orbit__largest"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 100%;
  min-height: 500px;
  position: relative;
  overflow: hidden;
  transform: translateY(-30px)
}

.planet {
  background: radial-gradient(farthest-side at 0px 0px, #c4b449 30%, #9c3b20 40%);
  width: 150px;
  height: 150px;
  border-radius: 100%;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%)
}

.planet.planet__front {
  background: radial-gradient(farthest-side at -300px 20px, #c4b449 80%, #9c3b20 100%, rgba(0,0,0,0));
  z-index: 1000;
}

.orbit__container {
  border: 2px solid #f5b858;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -45%) rotateX(45deg) rotateZ(45deg);
  box-shadow: 0 0 0 8px rgba(245, 184, 88, .25), inset 0 0 0 8px rgba(245, 184, 88, .25);
}

@keyframes orbit {
  from {
    transform: translate(-50%, 0%) rotate(var(--satelite-rotate)) rotateZ(0);
  }

  to {
    transform: translate(-50%, 0%) rotate(var(--satelite-rotate)) rotateZ(360deg);
  }
}

.satellite__container {
  transform: translate(-50%, 0%) rotate(var(--satelite-rotate));
  height: 50%;
  position: absolute;
  left: 50%;
  top: 0;
  transform-origin: bottom center;
}

.satellite__container__small {
  transform: translate(-50%, 0%) rotate(var(--satelite-rotate));
  animation: 4s orbit infinite linear;
}

.satellite {
  background: #fefcf0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  position: absolute;
  left: 50%;
  top: 0%;
  transform: translate(-50%, -50%);
  animation: satellite 2s ease-out infinite alternate-reverse;
}

@keyframes satellite {
  0% {
    box-shadow: 0 0 0 15px rgba(254, 252, 240, .2);
  }

  80% {
    box-shadow: 0 0 0 15px rgba(254, 252, 240, .2);
  }

  100% {
    box-shadow: 0 0 0 25px rgba(254, 252, 240, .3);
  }
}

.satellite__small {
  background: #ffd023;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  position: absolute;
  left: 50%;
  top: 0%;
  transform: translate(-50%, -50%);
  transform-origin: bottom center;
}

.orbit__small__container {
  height: 180px;
  width: 180px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  animation: orbit__small 3s infinite linear;
  z-index: 1000;
}

.orbit__small {
  left: 50%;
  width: 100%;
  height: 100%;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: inset 0 2px 0 0px #fefcf0;
  /* border: 2px solid red; */
  /* background: yellow; */
  border-radius: 100%;
  position: absolute;
  /* transform: translate(-50%, -50%) rotateX(-55deg) rotateY(20deg); */
  z-index: 1000;
  clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);
}

/* .orbit__smal:before {
  content: ""
} */

.orbit__small__satellite {
  width: 10px;
  height: 10px;
  position: absolute;
  background: #ffd023;
  border-radius: 50%;
  left: 50%;
  top: 0;
  transform: translate(-50%, -25%);
}

@keyframes orbit__small {
  from {
    transform: translate(-50%, -50%) rotateX(-55deg) rotateY(20deg) rotate(0);
  }

  to {
    transform: translate(-50%, -50%) rotateX(-55deg) rotateY(20deg) rotate(360deg);
  }
}

.orbit__large {
  width: 500px;
  height: 500px;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  box-shadow: inset 0 3px 1px 0 rgba(255, 102, 0, 0.5);
  position: absolute;
  animation: 3s orbit__large infinite linear reverse;
  border: 1px solid rgba(255, 102, 0, 0.3);
}

.orbit__largest {
  width: 650px;
  height: 650px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -45%) rotateX(45deg);
  border-radius: 50%;
  box-shadow: inset 0 3px 1px 0 rgba(255, 207, 35, 0.5);
  position: absolute;
  animation: 6s orbit__large infinite linear;
  border: 1px solid rgba(255, 207, 35, 0.3);
}

@keyframes orbit__large {
  from {
    transform: translate(-50%, -45%) rotateX(50deg) rotateZ(0);
  }

  to {
    transform: translate(-50%, -45%) rotateX(50deg) rotateZ(360deg);
  }
}
</style>