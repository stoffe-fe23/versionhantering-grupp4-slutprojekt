// Thien (group 5) - checks if URL is valid, returns true or false
export function getTextAndConvertToLink(trimmedText) {
    const pattern = /(https?\:\/\/)?(www\.)?[^\s]+\.[^\s]+/g;
    return trimmedText.replace(pattern, (matched) => {
        let withProtocol = matched;
        if (!withProtocol.startsWith("http")) {
            withProtocol = "http://" + matched;
        }
        return `<a class="text-link" href="${withProtocol}">${matched}</a>`;
    });
}