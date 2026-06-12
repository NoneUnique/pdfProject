# core/pdf/pdf_search.py

class PDFSearch:

    def __init__(self):

        self.index = []

    def build(self, data):

        self.index = data

    def search(self, keyword):

        keyword = keyword.lower()

        results = []

        for item in self.index:

            text = item["text"]

            if keyword in text.lower():

                results.append({
                    "page": item["page"],
                    "preview": text[:120],
                })

        return results