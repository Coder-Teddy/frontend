import { useState, useEffect } from "react";
import init, { calc } from "./wasm/wasm_calculator";
import TextToShader from "./TextToShader";

function App() {
  const [tab, setTab] = useState("calc");

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-6">
      <nav className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            tab === "calc"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 hover:bg-gray-50"
          }`}
          onClick={() => setTab("calc")}
        >
          Rust Calculator
        </button>
        <button
          className={`px-4 py-2 rounded ${
            tab === "shader"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 hover:bg-gray-50"
          }`}
          onClick={() => setTab("shader")}
        >
          Text-to-Shader
        </button>
      </nav>

      {tab === "calc" ? <CalcTab /> : <TextToShader />}
    </div>
  );
}

function CalcTab() {
  const [expr, setExpr] = useState("");
  const [res, setRes] = useState("");

  useEffect(() => {
    init();
  }, []);

  const onCalc = () => {
    try {
      setRes(calc(expr));
    } catch (e) {
      setRes(`Error: ${e}`);
    }
  };

  return (
    <section className="bg-white shadow p-6 rounded-lg max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Rust/WASM Calculator</h2>
      <input
        className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        placeholder="Enter expression (e.g., 2 + 3)"
      />
      <button
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        onClick={onCalc}
      >
        Compute
      </button>
      <p className="mt-4 text-gray-700 font-medium">Result: {res}</p>
    </section>
  );
}

export default App;