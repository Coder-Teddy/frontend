import { useState, useRef, useEffect } from "react";

export default function TextToShader() {
  const [prompt, setPrompt] = useState("");
  const [shader, setShader] = useState("");
  const [error, setError] = useState("");
  const [compiling, setCompiling] = useState(false);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const extractGLSLCode = (text) => {
    const match = text.match(/```glsl\s*([\s\S]*?)\s*```/);
    return match ? match[1].trim() : text.trim();
  };

  const submit = async () => {
    if (!prompt.trim()) return;

    setCompiling(true);
    setError("");
    setShader("");

    try {
      const res = await fetch("https://backend-cold-snowflake-4736.fly.dev/api/shader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setShader("// Error: " + data.error);
        return;
      }

      const cleanCode = extractGLSLCode(data.shader);
      setShader(cleanCode);
      renderShader(cleanCode);
    } catch (e) {
      setError("Backend error: " + e.message);
      setShader("// Backend error");
    } finally {
      setCompiling(false);
    }
  };

  const renderShader = (fragmentShaderSource) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      setError("WebGL not supported");
      return;
    }

    const vertexShaderSource = `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      setError("Failed to compile shaders");
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setError("Failed to link program");
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    let startTime = Date.now();

    const render = () => {
      const currentTime = (Date.now() - startTime) / 1000;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.uniform1f(timeLocation, currentTime);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationRef.current = requestAnimationFrame(render);
    };

    render();
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Text-to-Shader</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Describe your shader:</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A pulsating grid"
              className="w-full p-3 border border-gray-300 rounded-md h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={submit}
            disabled={compiling}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {compiling ? "Generating…" : "Generate Shader"}
          </button>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Shader Preview:</label>
          <canvas
            ref={canvasRef}
            width="400"
            height="300"
            className="border border-gray-300 rounded-md bg-black"
          />
        </div>
      </div>

      {shader && (
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Generated Shader Code:</label>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
            {shader}
          </pre>
        </div>
      )}
    </div>
  );
}
