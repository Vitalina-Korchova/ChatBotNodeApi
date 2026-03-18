from flask import Flask, request, jsonify
from nlp import process_text

app = Flask(__name__)

@app.route("/parse", methods=["POST"])
def parse():
    data = request.json

    if not data or "text" not in data:
        return jsonify({"error": "Text is required"}), 400

    text = data.get("text", "")

    result = process_text(text)

    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5000)
