from pathlib import Path
from typing import List, Optional
from app.parsers.base import BaseParser, ParserResult
from app.parsers.txt_log_parser import TxtLogParser
from app.parsers.csv_parser import CsvParser
from app.parsers.json_parser import JsonParser
from app.parsers.eml_parser import EmlParser

class ParserRegistry:
    def __init__(self):
        self.parsers: List[BaseParser] = [
            EmlParser(),
            JsonParser(),
            CsvParser(),
            TxtLogParser(),
        ]

    def register(self, parser: BaseParser):
        self.parsers.insert(0, parser)

    def get_parser(self, filename: str, media_type: str = "") -> Optional[BaseParser]:
        for parser in self.parsers:
            if parser.can_parse(filename, media_type):
                return parser
        return None

    def parse_file(self, file_path: Path, filename: str, media_type: str = "") -> ParserResult:
        parser = self.get_parser(filename, media_type)
        if not parser:
            ext = Path(filename).suffix
            return ParserResult(
                errors=[f"Unsupported format '{ext or 'unknown'}'. Supported formats: .eml, .json, .csv, .txt, .log."],
                format_name="UNSUPPORTED"
            )
        return parser.parse(file_path, filename)

default_registry = ParserRegistry()
