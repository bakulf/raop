require 'kramdown'
require 'yaml'
require 'pp'

begin
  data = YAML.load_file ARGV[0]
rescue
  puts "Error parsing the yamlfile."
  exit
end

['rdf_template', 'vars', 'classes', 'properties'].each do |x|
  if not data.include? x
    puts "The yamlfile must contain the element #{x}."
    exit
  end
end

begin
  template = File.read data['rdf_template']
rescue
  puts "The template file doesn't exist."
  exit
end

data['vars'].each do |key,value|
  template.gsub! "{raop.vars.#{key}}", value
end

c = ""

data['classes'].each do |x|
  c += "  <rdf:Description rdf:about=\"&raop;#{x['name']}\">\n"
  if x.include? 'label'
    c += "    <rdfs:label>#{x['label']}</rdfs:label>\n"
  else
    c += "    <rdfs:label>#{x['name']}</rdfs:label>\n"
  end
  c += "    <rdfs:comment>#{x['comment']}</rdfs:comment>\n"
  c += "    <rdfs:isDefinedBy rdf:resource=\"&raop;\" />\n"
  c += "    <rdf:type rdf:resource=\"&rdfs;Class\" />\n"
  c += "    <rdf:type rdf:resource=\"&owl;Class\" />\n"
  c += "    <rdfs:subClassOf rdf:resource=\"&rdf;Property\" />\n"

  if x.include? 'equivalentClasses'
    x['equivalentClasses'].each do |eq|
      c += "    <owl:equivalentClass>\n"
      c += "      <owl:Class rdf:about=\"#{eq['url']}\" rdfs:label=\"#{eq['name']}\" />\n"
      c += "    </owl:equivalentClass>\n"
    end
  end

  if x.include? 'subclassOf'
    if x['subclassOf'].kind_of?(Array)
      x['subclassOf'].each do |sub|
        c +="    <rdfs:subClassOf rdf:resource=\"&raop;#{sub}\" />\n"
      end
    else
      c +="    <rdfs:subClassOf rdf:resource=\"&raop;#{x['subclassOf']}\" />\n"
    end
  end

  if x.include? 'raopCategory'
    x['raopCategory'].each do |category|
      c += "    <rdf:type rdf:resource=\"&raop;#{category}\" />\n"
    end
  end

  c += "  </rdf:Description>\n\n"
end

data['properties'].each do |x|
  c += "  <rdf:Description rdf:about=\"&raop;#{x['name']}\">\n"
  if x.include? 'label'
    c += "    <rdfs:label>#{x['label']}</rdfs:label>\n"
  else
    c += "    <rdfs:label>#{x['name']}</rdfs:label>\n"
  end
  c += "    <rdfs:comment>#{x['comment']}</rdfs:comment>\n"
  c += "    <rdfs:isDefinedBy rdf:resource=\"&raop;\" />\n"
  c += "    <rdf:type rdf:resource=\"&rdfs;Property\" />\n"
  c += "    <rdf:type rdf:resource=\"&owl;InverseFunctionalProperty\" />\n"
  c += "    <rdf:type rdf:resource=\"&owl;ObjectProperty\" />\n"

  if x.include? 'domain'
    if x['domain'].kind_of?(Array)
      x['domain'].each do |sub|
        c +="    <rdfs:domain rdf:resource=\"&raop;#{sub}\" />\n"
      end
    else
      c +="    <rdfs:domain rdf:resource=\"&raop;#{x['domain']}\" />\n"
    end
  end

  if x.include? 'range'
    if x['range'].kind_of?(Array)
      x['range'].each do |sub|
        c +="    <rdfs:range rdf:resource=\"&raop;#{sub}\" />\n"
      end
    else
      c +="    <rdfs:range rdf:resource=\"&raop;#{x['range']}\" />\n"
    end
  end

  c += "  </rdf:Description>\n\n"
end

template.gsub! "{raop.classes_and_properties}", "#{c}"

puts template
