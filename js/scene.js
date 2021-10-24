//initialise simplex noise instance
const noise = new SimplexNoise();

// the main visualiser function
const vizInit = function () {
  //Uploaded file
  const file = document.getElementById("thefile");
  //audio controlls
  const audio = document.getElementById("audio");
  //label for the button
  const fileLabel = document.querySelector("label.file");

  document.onload = function (e) {
    console.log(e);
    //plays audio
    audio.play();
    //play function
    play();
  };
  file.onchange = function () {
    //change label state
    fileLabel.classList.add("normal");
    //play auto
    audio.classList.add("active");
    const files = this.files;

    //fetch uploaded audio
    audio.src = URL.createObjectURL(files[0]);
    //load audio from upload
    audio.load();
    //play audio
    audio.play();
    //play function
    play();
  };

  //play animation / audio
  function play() {
    //get audio data
    const context = new AudioContext();
    const src = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    src.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    //here comes the webgl
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    //camera / view of the scene
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    //set camera position
    camera.position.set(0, 0, 100);
    //change camera position
    camera.lookAt(scene.position);
    //Add camera to scene
    scene.add(camera);

    //render three.js
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    //set window size
    renderer.setSize(window.innerWidth, window.innerHeight);

    const planeGeometry = new THREE.PlaneGeometry(800, 800, 20, 20);
    const planeMaterial = new THREE.MeshLambertMaterial({
      //colour of the lines
      color: 0xffffff,
      //sides
      side: THREE.DoubleSide,
      //wireframe = texture
      wireframe: true,
    });

    //plane = render object
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -0.5 * Math.PI;
    plane.position.set(0, 30, 0);
    group.add(plane);

    //plane = render object
    const plane2 = new THREE.Mesh(planeGeometry, planeMaterial);
    plane2.rotation.x = -0.5 * Math.PI;
    plane2.position.set(0, -30, 0);
    group.add(plane2);

    const icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
    const lambertMaterial = new THREE.MeshLambertMaterial({
      //colour of the ball
      color: 0xe10600,
      //wireframe = texture
      wireframe: true,
    });

    const ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    //set ball to the middle of the screen
    ball.position.set(0, 0, 0);
    //add ball to the render
    group.add(ball);

    //light colour
    const ambientLight = new THREE.AmbientLight(0xaaaaaa);
    //add light to the render
    scene.add(ambientLight);

    //spotLight colour
    const spotLight = new THREE.SpotLight(0xffffff);
    //spotLight intensity
    spotLight.intensity = 0.9;
    //set spotLight position and angle
    spotLight.position.set(-10, 40, 20);
    //set spotLight to look and focus on the ball
    spotLight.lookAt(ball);
    //spotLight creates shadows
    spotLight.castShadow = true;
    //add spotLight to the render
    scene.add(spotLight);

    //removed due to bugs (Check README)
    // const orbitControls = new THREE.OrbitControls(camera);
    // orbitControls.autoRotate = true;

    //add groups to scene
    scene.add(group);

    document.getElementById("out").appendChild(renderer.domElement);

    //resizes the window
    window.addEventListener("resize", onWindowResize, false);

    //call function
    render();

    //funtion in charge of rendering the main view
    function render() {
      analyser.getByteFrequencyData(dataArray);

      const lowerHalfArray = dataArray.slice(0, dataArray.length / 2 - 1);
      const upperHalfArray = dataArray.slice(
        dataArray.length / 2 - 1,
        dataArray.length - 1
      );

      const overallAvg = avg(dataArray);
      const lowerMax = max(lowerHalfArray);
      const lowerAvg = avg(lowerHalfArray);
      const upperMax = max(upperHalfArray);
      const upperAvg = avg(upperHalfArray);

      const lowerMaxFr = lowerMax / lowerHalfArray.length;
      const lowerAvgFr = lowerAvg / lowerHalfArray.length;
      const upperMaxFr = upperMax / upperHalfArray.length;
      const upperAvgFr = upperAvg / upperHalfArray.length;

      makeRoughGround(plane, modulate(upperAvgFr, 0, 1, 0.5, 4));
      makeRoughGround(plane2, modulate(lowerMaxFr, 0, 1, 0.5, 4));

      makeRoughBall(
        ball,
        modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8),
        modulate(upperAvgFr, 0, 1, 0, 4)
      );

      group.rotation.y += 0.005;
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    //when audio plays change the size of the ball in the middle
    function makeRoughBall(mesh, bassFr, treFr) {
      mesh.geometry.vertices.forEach(function (vertex, i) {
        const offset = mesh.geometry.parameters.radius;
        const amp = 7;
        const time = window.performance.now();
        vertex.normalize();
        const rf = 0.00001;
        const distance =
          offset +
          bassFr +
          noise.noise3D(
            vertex.x + time * rf * 7,
            vertex.y + time * rf * 8,
            vertex.z + time * rf * 9
          ) *
            amp *
            treFr;
        vertex.multiplyScalar(distance);
      });
      mesh.geometry.verticesNeedUpdate = true;
      mesh.geometry.normalsNeedUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeFaceNormals();
    }

    //when audio plays change the shape of the mesh
    function makeRoughGround(mesh, distortionFr) {
      mesh.geometry.vertices.forEach(function (vertex, i) {
        const amp = 2;
        const time = Date.now();
        const distance =
          (noise.noise2D(vertex.x + time * 0.0003, vertex.y + time * 0.0001) +
            0) *
          distortionFr *
          amp;
        vertex.z = distance;
      });
      mesh.geometry.verticesNeedUpdate = true;
      mesh.geometry.normalsNeedUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeFaceNormals();
    }

    //plays audio
    audio.play();
  }
};

//load visualizer on window load
window.onload = vizInit();

document.body.addEventListener("touchend", function (ev) {
  context.resume();
});

//some helper functions here
function fractionate(val, minVal, maxVal) {
  return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
  const fr = fractionate(val, minVal, maxVal);
  const delta = outMax - outMin;
  return outMin + fr * delta;
}

function avg(arr) {
  const total = arr.reduce(function (sum, b) {
    return sum + b;
  });
  return total / arr.length;
}

function max(arr) {
  return arr.reduce(function (a, b) {
    return Math.max(a, b);
  });
}
