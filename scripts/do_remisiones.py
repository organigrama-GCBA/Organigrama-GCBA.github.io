# -*- coding: utf-8 -*-
import sys; sys.path.insert(0,'scripts')
import merge_funciones as M

BR='Descripción breve (sin anexo de responsabilidades específico)'
def r(t,f=BR): return {'responsabilidad':t,'fuente':f}

new={
 # Cuerpos consultivos / asesores
 'MCGC-CPPH':r('Órgano de asesoramiento para la preservación del patrimonio histórico cultural de la Ciudad de Buenos Aires.'),
 'ENTUR-DC':r('Directorio Consultivo del Ente de Turismo: órgano de consulta y participación conforme la Ley N° 2.627.','Ley 2.627'),
 'DEJENTUR':r('Consejo Asesor del Ente de Turismo: órgano consultivo conforme la Ley N° 2.627.','Ley 2.627'),
 'EAIT-CODEI':r('Comité de Docencia e Investigación (CODEI): asesora en materia de docencia e investigación en su ámbito.'),
 'UAAJG':r('Unidad de Asesores de la Jefatura de Gabinete de Ministros: asesoramiento directo a la Jefatura de Gabinete.'),
 # Instituto de Gestión Electoral
 'IGEA':r('Instituto de Gestión Electoral Adjunta: asiste y reemplaza a la Presidencia del Instituto de Gestión Electoral (Ley N° 6.031).','Ley 6.031'),
 'UEE':r('Unidad de Enlace Electoral: coordina la articulación electoral en el ámbito del Instituto de Gestión Electoral.'),
 # IDECBA
 'DGESTYC':r('Dirección General de Estadística y Censos: produce, sistematiza y difunde la estadística pública oficial de la Ciudad (IDECBA).'),
 # Sanidad y mascotas
 'UCSYTRM':r('Unidad de Coordinación de Sanidad y Tenencia Responsable de Mascotas: coordina políticas de sanidad y tenencia responsable de animales de compañía.'),
 # DG sin anexo de responsabilidades en los decretos procesados (descripción por su denominación)
 'DGACD':r('Dirección General de Activos Digitales (creada por Decreto 17/26): gestiona los activos digitales de la comunicación de gobierno.'),
 'DGNMC':r('Dirección General de Nuevos Medios de Comunicación: desarrolla y gestiona los nuevos medios y plataformas de comunicación del Gobierno de la Ciudad.'),
 'DGIPS':r('Dirección General de Innovación y Simplificación de Procesos: impulsa la innovación y la simplificación de los procesos productivos y administrativos.'),
 'DGSGE':r('Dirección General de Sistemas de Gestión Escolar: administra los sistemas de información y gestión del ámbito educativo.'),
 'DGSGES':r('Dirección General de Sistemas de Gestión: administra sistemas de gestión transversales del Gobierno de la Ciudad.'),
 'DGIDEPE':r('Dirección General de Investigación, Desarrollo y Ejecución de Proyectos Especiales: formula y ejecuta proyectos especiales de desarrollo urbano.'),
}
M.merge(new)
print('cargadas:',len(new),sorted(new))
