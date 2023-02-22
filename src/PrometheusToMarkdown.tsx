import React, { useState } from 'react';
import './PrometheusToMarkdown.css';
import ReactMarkdown from 'react-markdown'
import ReactDom from 'react-dom'
import remarkGfm from 'remark-gfm'

function PrometheusToMarkdown() {
    const [prometheusText, setPrometheusText] = useState<string>('');
    const [markdownOutput, setMarkdownOutput] = useState<string>('');

    const handleClearClick = () => {
        setPrometheusText("");
        setMarkdownOutput("");
    };

    function handleSaveMarkdown() {
        const element = document.createElement("a");
        const file = new Blob([markdownOutput], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = "output.md";
        document.body.appendChild(element);
        element.click();
    }

        const handleCopyToClipboard = () => {
            navigator.clipboard.writeText(markdownOutput);
        };

        interface Metric {
        name: string;
        type: string;
        description: string;
        labels: Map<string, string>;
        value?: number;
        buckets?: { [key: string]: number };
    }

    function extractKeyValuePair(str: string): Map<string, string> {
        const regex = /(\w+)="(.*?)"/g;
        const match = str.match(regex);
        const keyValuePairs = new Map<string, string>();

        if (match) {
            match.forEach((pair) => {
                const [key, value] = pair.split('=');
                keyValuePairs.set(key, value.replace(/"/g, ''));
            });
        }

        return keyValuePairs;
    }

    function prometheusToMarkdown(input: string): string {
        const metrics: Metric[] = [];

        // parse input and extract metrics
        const lines = input.trim().split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("# HELP ")) {
                const name = line.substring("# HELP ".length).split(" ")[0];
                const description = line.substring(name.length + "# HELP ".length + 1);
                const typeLine = lines[i + 1].trim();
                const type = typeLine.substring("# TYPE ".length).split(" ")[1]
                const metric: Metric = { name, type, description, labels: new Map() };
                metrics.push(metric);
                i++; // skip type line
            } else if (line.startsWith("# TYPE ")) {
                // skip, already handled
            } else {
                const name = line.split(" ")[0].split("{")[0];
                const labels: Map<string, string> = extractKeyValuePair(line);
                const metric = metrics.find(m => m.name === name);
                if (metric) {
                    metric.labels= labels;
                }
            }
        }

        // generate markdown output
        let output = "";
        metrics.sort((a, b) => a.name.localeCompare(b.name));
        for (const metric of metrics) {
            output += `## ${metric.name}\n`;
            output += `Type: ${metric.type}\n\n`;
            output += `Description: ${metric.description}\n`;
            if (metric.labels.size> 0) {
                output += "| Available Labels | Example Value |\n";
                output += "|------------------|---------------|\n";
                for (const [key, value] of metric.labels) {
                    output += `| ${key} | ${value} |\n`;
                }
            }
            output += "\n";
        }
        return output;
    }


    function handleInputChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        setPrometheusText(event.target.value);
        setMarkdownOutput(prometheusToMarkdown(event.target.value));
    }
    return (
        <div className="container">
            <div className="input">
                <h3>Prometheus Exposition Format</h3>
                <div className="action_buttons">
                    <button onClick={handleClearClick}>Clear</button>
                </div>
                <textarea
                    id="prometheus-input"
                    value={prometheusText}
                    onChange={handleInputChange}
                />
            </div>
            <div className="output">
                <h3>Markdown Output</h3>
                <div className="action_buttons">
                <button onClick={handleCopyToClipboard}>Copy Markdown</button>
                <button onClick={handleSaveMarkdown}>Save Markdown</button>
                </div>
                <div className="scrollable">
                <ReactMarkdown children={markdownOutput}  remarkPlugins={[remarkGfm]}
                ></ReactMarkdown>
                </div>
            </div>

        </div>
    );
}

export default PrometheusToMarkdown;
