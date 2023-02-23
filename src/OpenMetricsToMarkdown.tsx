import React, {useState} from 'react';
import './OpenMetricsToMarkdown.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw'


function OpenMetricsToMarkdown() {
    const [openMetricsText, setOpenMetricsText] = useState<string>('');
    const [markdownOutput, setMarkdownOutput] = useState<string>('');

    const handleClearClick = () => {
        setOpenMetricsText("");
        setMarkdownOutput("");
    };

    function handleSaveMarkdown() {
        const element = document.createElement("a");
        const file = new Blob([markdownOutput], {type: "text/plain"});
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
        source: string[];
        labels: Map<string, [string]>;
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

    function openMetricsToMarkdown(input: string): string {
        const metrics: Metric[] = parseMetrics(input);

        return generateMarkdown(metrics);
    }

    function parseMetrics(input: string): Metric[] {
        const lines = input.trim().split("\n");
        const metrics: Metric[] = [];
        let currentMetric: Metric | undefined;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("# HELP ")) {
                const [name, description] = parseNameAndDescription(line);
                const [type] = parseType(lines, i + 1);
                const source:string[] = [];
                const metric = { name, description, type, source, labels: new Map() };
                currentMetric = metric;
                metric.source.push(line);

                metrics.push(metric);
            } else if (line.startsWith("# TYPE ")) {
                if (currentMetric) currentMetric.source.push(line);
            } else {
                if (currentMetric) currentMetric.source.push(line);
                const [name, labels] = parseNameAndLabels(line);
                const metric = metrics.find(m => m.name === name);
                if (metric) {
                    updateLabels(metric.labels, labels);
                }
            }
        }
        return metrics;
    }

    function generateMarkdown(metrics: Metric[]): string {
        const sortedMetrics = metrics.slice().sort((a, b) => a.name.localeCompare(b.name));
        let output = "";

        for (const metric of sortedMetrics) {
            output += `## ${metric.name}\n`;
            output += `**Type**: ${metric.type}\n\n`;
            output += `**Description**: ${metric.description}\n`;

            if (metric.labels.size > 0) {
                output += "| Available Labels | Example Value |\n";
                output += "|------------------|---------------|\n";

                for (const [key, value] of metric.labels) {
                    output += `| ${key} | ${value[0]} |\n\n`;
                }
            }
            output += "  \n";
            output += "\n<details><summary>Raw</summary>\n\n";
            output += "```text\n";
            let rawRows = "";
            metric.source.forEach((line) => {
                rawRows +=  `${line}\n`;
            });
            output += rawRows;
            output += "```\n";
            output += "</details>\n\n";
            output += "---\n";

        }

        return output;
    }

    function parseNameAndDescription(line: string): [string, string] {
        const name = line.substring("# HELP ".length).split(" ")[0];
        const description = line.substring(name.length + "# HELP ".length + 1);
        return [name, description];
    }

    function parseType(lines: string[], i: number): [string, number] {
        const typeLine = lines[i].trim();
        const type = typeLine.substring("# TYPE ".length).split(" ")[1];
        return [type, i + 1];
    }

    function parseNameAndLabels(line: string): [string, Map<string, string>] {
        const name = line.split(" ")[0].split("{")[0];
        const labels = extractKeyValuePair(line);
        return [name, labels];
    }

    function updateLabels(map: Map<string, string[]>, newLabels: Map<string, string>): void {
        newLabels.forEach((value, key) => {
            const previous = map.get(key);

            if (!previous) {
                map.set(key, [value]);
            } else {
                previous.push(value);
            }
        });
    }


    function handleInputChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        setOpenMetricsText(event.target.value);
        setMarkdownOutput(openMetricsToMarkdown(event.target.value));
    }

    return (
        <div className="container">
            <div className="input">
                <div className="input-header">
                    <h3>OpenMetrics</h3>
                    <div className="action_buttons">
                        <button onClick={handleClearClick}>Clear</button>
                    </div>
                </div>
                <textarea
                    id="openMetrics-input"
                    value={openMetricsText}
                    onChange={handleInputChange}
                />
            </div>
            <div className="output">
                <div className="output-header">
                    <h3>Markdown Output</h3>
                    <div className="action_buttons">
                        <button onClick={handleCopyToClipboard}>Copy Markdown</button>
                        <button onClick={handleSaveMarkdown}>Save Markdown</button>
                    </div>
                </div>
                <div className="scrollable">
                    <ReactMarkdown children={markdownOutput}
                                   rehypePlugins={[rehypeRaw]}
                                   remarkPlugins={[remarkGfm]}
                    ></ReactMarkdown>
                </div>
            </div>

        </div>
    );
}

export default OpenMetricsToMarkdown;
